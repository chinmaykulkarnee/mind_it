Template.Embed.rendered = function () {
    var textBox = document.getElementById("embedCodeTextBox");
    Meteor.call("getSharableReadLink", App.currentMap, function (error, value) {
        var link = value;
        link = link.replace("sharedLink", "embed");

        var url = App.getSharableLink() + link;

        var code = "<iframe width=" + "\"854\"" + " height= " + "\"480\" src=\"" + url + "\" frameborder= \"0\" allowfullscreen webkitallowfullscreen mozallowfullscreen ></iframe>";
        textBox.value = code;
    })
};

Template.Embed.events({
    'click #embedCodeTextBox': function (e, args) {
        $("#embedCodeTextBox").select();
    },
    'click #copyEmbedCode': function (e, args) {
        e.preventDefault();

        var code = document.getElementById("embedCodeTextBox");
        code.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            console.log('Oops, unable to copy');
        }
    }
});