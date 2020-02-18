require('dotenv').config()
pry = require('pryjs');

var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");
var User = require("../models/user");
var Notification = require("../models/notification");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'theoldpark', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

//INDEX - show all campgrounds
router.get("/", function(req, res){
	// eval(pry.it);
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		// Get all campgrounds from DB
		Campground.find({name: regex}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				if(allCampgrounds.length < 1){
					req.flash("error", "Campground no found");
                        return res.redirect("back");
				}
				res.render("campgrounds/index", {campgrounds: allCampgrounds, page: 'campgrounds'});	
			}
		});	
	}else {
		// Get all campgrounds from DB
		Campground.find({}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				res.render("campgrounds/index", {campgrounds: allCampgrounds, page: 'campgrounds'});	
			}
		});	
	}
});


//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), async function(req, res) {
  // get data from form and add to campgrounds array
  var name = req.body.name;
  var cost = req.body.cost;
  // var image = req.body.image;
  var desc = req.body.description;
  var author = {
      id: req.user._id,
      username: req.user.username
  } 
  cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
	  var image = result.secure_url;
	  var imageId = result.public_id;
	  geocoder.geocode(req.body.location, async function (err, data) {
			if (err || !data.length) {
			  req.flash('error', 'Invalid address');
			  return res.redirect('back');
			}
			var lat = data[0].latitude;
			var lng = data[0].longitude;
			var location = data[0].formattedAddress;
			var newCampground = {name: name, image: image, imageId: imageId, cost: cost, description: desc, author:author, location: location, lat: lat, lng: lng};
		  
			try{
				let campground = await Campground.create(newCampground);
				let user = await User.findById(req.user._id).populate('followers').exec();
				let newNotification = {
					username: req.user.username,
					campgroundId: campground.id
				}
				for(const follower of user.followers){
					let notification = await Notification.create(newNotification);
					follower.notifications.push(notification);
					follower.save();
				}
				//redirect back to campgrounds page
				res.redirect(`/campgrounds/${campground.id}`);
			} catch(err){
				req.flash('error', err.message);
				res.redirect('back');
			}
  		});
	
	});
  // eval(pry.it)
});

//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

//SHOW - shows more info about one campground
router.get("/:id", function(req, res){
	//find the campground with provided ID
	Campground.findById(req.params.id).populate("comments").populate({
		path: "reviews",
		options: {sort: {createdAt: -1}}
	}).exec(function(err, foundCampground){
		if(err){
			console.log(err);
		} else {
			console.log(foundCampground);
			//render show template with that campground
			res.render("campgrounds/show", {campground: foundCampground});
		}
	});
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
		Campground.findById(req.params.id, function(err, foundCampground){
		res.render("campgrounds/edit", {campground: foundCampground});
		});	
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
	geocoder.geocode(req.body.location, function (err, data) {
		delete req.body.campground.rating;
		if (err || !data.length) {
		  req.flash('error', 'Invalid address');
		  return res.redirect('back');
		}	
		req.body.campground.lat = data[0].latitude;
		req.body.campground.lng = data[0].longitude;
		req.body.campground.location = data[0].formattedAddress;
		Campground.findById(req.params.id, req.body.campground, async function(err, campground){
			if(err){
				req.flash("error", err.message);
				res.redirect("back");
			} else {
				if(req.file){
					try{
						await cloudinary.v2.uploader.destroy(campground.imageId);
						var result = await cloudinary.v2.uploader.upload(req.file.path);
						campground.imageId = result.public_id;
						campground.image = result.secure_url;
					} catch(err){
						req.flash("error", err.message);
						return res.redirect("back");
					}
				}
				campground.name = req.body.campground.name;
				campground.description = req.body.campground.description;
				campground.save();
				// eval(pry.it);
				req.flash("success","Successfully Updated!");
				res.redirect("/campgrounds/" + campground._id);
			}
		});
	});
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		try{
			await cloudinary.v2.uploader.destroy(campground.imageId);
			Comment.remove({"_id": {$in: campground.comments}});
			Review.remove({"_id": {$in: campground.reviews}});
			campground.remove();
			req.flash('success', 'Campground deleted successfully!');
			res.redirect('/campgrounds');
		}catch(err){
			if(err){
				req.flash("error", err.message);
				return res.redirect("back");
			}
		}		
	});
});

function escapeRegex(text){
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;



