/* global Router */

Router.configure({layoutTemplate: 'main', notFoundTemplate: 'error_page'});

//Router.route('/', {
//	name: 'downtimeNotify',
//	template: 'downtimeNotify'
//});

//Router.route('/asdfghhome/', {
//	template: 'home',
//	waitOn: function () {
//		return Meteor.subscribe("userdata", Meteor.userId());
//	}
//});

//Router.route('/create/:_id', {
//	template: 'downtimeNotify',
//	waitOn: function () {
//		return Meteor.subscribe("userdata", Meteor.userId());
//	}
//});
//
//Router.route('/createMindmap/:_id', {
//	name: "create",
//	template: "create",
//	waitOn: function () {
//		Meteor.subscribe("userdata");
//		return Meteor.subscribe("mindmap", this.params._id);
//	}, 
//	data: function () {
//		return {id: this.params._id, data: mindMapService.findTree(this.params._id)};
//	}
//});

Router.route('/', {
	name:'home',
	template: 'home',
	waitOn: function () {
		return Meteor.subscribe("userdata", Meteor.userId());
	}
});

Router.route('/create/:_id', {
	name: "create",
	template: "create",
	waitOn: function () {
		Meteor.subscribe("userdata");
		return Meteor.subscribe("mindmap", this.params._id);
	},
	data: function () {
		return {id: this.params._id, data: mindMapService.findTree(this.params._id)};
	}
});


Router.route('(/404)|/(.*)', {
	name: 'error_page',
	template: 'error_page',
	waitOn: function () {
		return Meteor.subscribe("userdata", Meteor.userId());
	}
});