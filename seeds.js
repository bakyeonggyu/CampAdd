var mongoose = require("mongoose");
var Campground = require("./models/campground");
var Comment = require("./models/comment");

var seeds = [
  {
      name: "Cloud's Rest",
      image: "https://farm4.staticflickr.com/3795/10131087094_c1c0a1c859.jpg",
      description: "blah blah blah",
      location:'Paris',
      lat:48.8589506,
      lng:2.2768486
  },
  {
      name: "Desert Mesa",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7g7f_0kbL2nYl_neR1wnv5BD7s0-Gdqe1KGXsva0uipGs20eI",
      description: "blah blah blah",
      location:'Paris',
      lat:48.8589506,
      lng:2.2768486
  },
  {
      name: "Canyon Floor",
      image: "https://farm1.staticflickr.com/189/493046463_841a18169e.jpg",
      description: "blah blah blah",
      location:'Paris',
      lat:48.8589506,
      lng:2.2768486
  }
];

async function seedDB(){
	try{
		await Campground.remove({});
		console.log('Campgrounds removed');
		await Comment.remove({});
		console.log('Comments removed');

		for(const seed of seeds){
			let campground = await Campground.create(seed);
			console.log('Campground created');
			let comment = await Comment.create(
				{
					text: 'This place is great, but I with there was internet',
					author: 'Homer'
				}
			)
			console.log('Comment created');
			campground.comments.push(comment);
			campground.save();
			console.log('Comment added to campground');
		}
	}catch(err){
		console.log(err);
	}	
}

module.exports = seedDB;