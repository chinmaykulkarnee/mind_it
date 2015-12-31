var focusAfterDelete = function (selectedNode, removedNodeIndex) {
  var parent = selectedNode.parent,
    children = parent[selectedNode.position] || parent.children || [],
    nextNode = children[removedNodeIndex],
    previousNode = children[removedNodeIndex - 1];
  App.selectNode(nextNode || previousNode || parent);
};

App.cutNode = function (asyncCallBack) {
  var sourceNode = App.map.getDataOfNodeWithClassNamesString(".selected");
  if (App.getDirection(sourceNode) === 'root') {
    alert("The root node cannot be cut!");
    return;
  }
  App.map.storeSourceNode(sourceNode);
  var selectedNodeIndex = (sourceNode.parent.children || []).indexOf(sourceNode);
  Meteor.call('deleteNode', sourceNode._id, function (err, data) {
    focusAfterDelete(sourceNode, selectedNodeIndex);
    if (asyncCallBack)
      asyncCallBack(err, data);
  });
};

App.pasteNode = function (sourceNode, targetNode, dir, previousSibling) {
  var newNode = App.map.addNewNode(targetNode, sourceNode.name, dir, previousSibling),
    childrenArray;
  if (sourceNode.hasOwnProperty('children') && sourceNode.children) {
    childrenArray = sourceNode.children;
  }
  else if (sourceNode.hasOwnProperty('_children') && sourceNode._children) {
    childrenArray = sourceNode._children;
  }
  if (sourceNode.hasOwnProperty('isCollapsed') && sourceNode.isCollapsed) {
    newNode.isCollapsed = sourceNode.isCollapsed;
    App.storeLocally(newNode);
  }
  if (childrenArray) {
    var previous = null;
    childrenArray.forEach(
      function (d) {
        previous = App.pasteNode(d, newNode, dir, previous);
      }
    );
  }
  return newNode;
};

var findSameLevelChild = function (node, depth, downwards) {
  var index;
  if (downwards)
    index = 0;
  if (!node.children)
    return node;
  if (node.depth == depth) {
    return node;
  }
  while (node.children) {
    if (!downwards)
      index = node.children.length - 1;
    node = node.children[index];
    if (node.depth == depth) {
      return node;
    }
  }
  return node;
};

var isParentChildMatchesThisNode = function (siblings, position, node) {
  return siblings[position]._id === node._id
};

var isGoingUpFromTopMostNode = function (siblings, node, downwards) {
  return !downwards && isParentChildMatchesThisNode(siblings, 0, node);
};

var isGoingDownFromBottomLastNode = function (iterator, numberOfSiblings, downwards) {
  return downwards && iterator == numberOfSiblings;
};

var findLogicalVerticalMovement = function(node, downwards) {
  var direction = App.getDirection(node);
  if (direction === 'root') return;

  var parent = node.parent,
    siblings = parent.children || [],
    iterator = downwards ? 0:1;

  if (parent[direction]) {
    siblings = parent[direction];
  }

  var numberOfSiblings = downwards ? siblings.length-1 : siblings.length;

  while(iterator < numberOfSiblings) {
    if (isParentChildMatchesThisNode(siblings, iterator, node)) {
      var iteratorDiff = downwards ? 1:-1;
      App.selectNode(findSameLevelChild(siblings[iterator + iteratorDiff], App.nodeSelector.prevDepthVisited, downwards));
      break;
    }
    iterator++;
  }
  if (isGoingDownFromBottomLastNode(iterator, numberOfSiblings, downwards))
    findLogicalVerticalMovement(parent, downwards);
  if(isGoingUpFromTopMostNode(siblings, node, downwards))
    findLogicalVerticalMovement(parent, downwards);
};

$(window).keyup(function (event) {
  if (event.keyCode == 113) { // F2
    (event.preventDefault || event.stop || event.stopPropagation || function () {
    }).call(event);
    var selectedNode = d3.select(".node.selected")[0][0];
    if (!selectedNode) return;
    App.showEditor.call(selectedNode);
  }
});

Mousetrap.bind('mod+x', function () {
  App.cutNode();
});

Mousetrap.bind('mod+c', function () {
  var sourceNode = App.map.getDataOfNodeWithClassNamesString(".selected");
  App.map.storeSourceNode(sourceNode);
});

Mousetrap.bind('mod+v', function () {
  var targetNode = App.map.getDataOfNodeWithClassNamesString(".node.selected");
  var sourceNode = App.map.sourceNode;
  var dir = App.calculateDirection(targetNode);
  if (targetNode.isCollapsed)
    App.expandRecursive(targetNode, targetNode._id);
  App.pasteNode(sourceNode, targetNode, dir);
  App.retainCollapsed();
});

var escapeOnNewNode = function(newNode, parentNode){
    $(window).unbind().on("keyup", (function(e) {
      if (e.keyCode === 27) {
        Meteor.call('deleteNode', newNode._id, function () {
          App.selectNode(parentNode);
        });
      }
    }));
  };

Mousetrap.bind('enter', function () {
  var selectedNode = App.map.getDataOfNodeWithClassNamesString(".node.selected");
  if (!selectedNode) return false;
  var parent = selectedNode.parent || selectedNode,
    sibling = selectedNode.position ? selectedNode : null,
    dir = App.calculateDirection(parent);

  App.deselectNode();
  var newNode = App.map.addNewNode(parent, "", dir, sibling);
  App.map.makeEditable(newNode._id);
  escapeOnNewNode(newNode, selectedNode);
  return false;
});

Mousetrap.bind('tab', function () {
  var selectedNode = App.map.getDataOfNodeWithClassNamesString(".node.selected");
  if (!selectedNode) return false;
  if (selectedNode.hasOwnProperty('isCollapsed') && selectedNode.isCollapsed) {
    App.expand(selectedNode, selectedNode._id);
  }
  var dir = App.calculateDirection(selectedNode);
  App.deselectNode();
  var newNode = App.map.addNewNode(selectedNode, "", dir);
  App.map.makeEditable(newNode._id);
  escapeOnNewNode(newNode, selectedNode);
  return false;
});

Mousetrap.bind('del', function () {
  var selectedNode = App.map.getDataOfNodeWithClassNamesString(".node.selected");
  if (!selectedNode) return;
  var dir = App.getDirection(selectedNode);

  if (dir === 'root') {
    alert('Can\'t delete root');
    return;
  }
  var children = selectedNode.parent[dir] || selectedNode.parent.children;
  if (!children) {
    alert('Could not locate children');
    return;
  }
  var selectedNodeIndex = children.indexOf(selectedNode);
  Meteor.call('deleteNode', selectedNode._id, function () {
    focusAfterDelete(selectedNode, selectedNodeIndex);
  });
});

var beforeBindEventAction = function (event) {
  (event.preventDefault || event.stop || event.stopPropagation || function () {
  }).call(event);
  return d3.select(".node.selected")[0][0];
};

var afterBindEventAction = function (node) {
  App.selectNode(node);
  if (node)
    App.nodeSelector.setPrevDepth(node.depth);
};

var caseAction = function (downwards, data, right) {
  var dir = App.getDirection(data);
  switch (dir) {
    case('root'):
      break;
    case('left'):
    case('right'):
      right(data, downwards);
      break;
  }
};

var bindEventAction = function (event, downwards, right) {
  var selection = beforeBindEventAction(event);
  if (selection) {
    var data = selection.__data__;
    caseAction(downwards, data, right);
  }
  return false;
};

var caseRightLeftForUpDownEvent = function (data, downwards) {
  findLogicalVerticalMovement(data, downwards);
};

Mousetrap.bind('up', function () {
  return bindEventAction(arguments[0], 0, caseRightLeftForUpDownEvent);
});

Mousetrap.bind('down', function () {
  return bindEventAction(arguments[0], 1, caseRightLeftForUpDownEvent);
});


Mousetrap.bind('left', function () {
  var event = arguments[0];
  var selection = beforeBindEventAction(event);
  if (selection) {
    var data = selection.__data__;
    var dir = App.getDirection(data), node;
    switch (dir) {
      case('right'):
      case('root'):
        node = data.parent || data.left[0];
        break;
      case('left'):
        if (data.hasOwnProperty('isCollapsed') && data.isCollapsed) {
          App.expand(data, data._id);
        }
        else {
          node = (data.children || [])[0];
        }
        break;
      default:
        break;
    }
    afterBindEventAction(node);
  }
});

Mousetrap.bind('right', function () {
  var event = arguments[0];
  (event.preventDefault || event.stop || event.stopPropagation || function () {
  }).call(event);
  // right key pressed
  var selection = d3.select(".node.selected")[0][0];
  if (selection) {
    var data = selection.__data__;
    var dir = App.getDirection(data), node;
    switch (dir) {
      case('left'):
      case('root'):
        node = data.parent || data.right[0];
        break;
      case('right'):
        if (data.hasOwnProperty('isCollapsed') && data.isCollapsed) {
          App.expand(data, data._id);
        }
        else {
          node = (data.children || [])[0];
        }
        break;
      default:
        break;
    }
    afterBindEventAction(node);
  }
});

Mousetrap.bind('space', function () {
  var event = arguments[0];
  (event.preventDefault || event.stop || event.stopPropagation || function () {
  }).call(event);
  var selected = d3.select(".selected")[0][0].__data__;
  App.toggleCollapsedNode(selected);
});

Mousetrap.bind('mod+e', function createXmlFile() {
  var rootNode = d3.selectAll('.node')[0].find(function (node) {
    return !node.__data__.position;
  });
  var rootNodeObject = rootNode.__data__;
  var XMLString = [];
  XMLString = "<map version=\"1.0.1\">\n";

  XMLString = App.JSONtoXML(XMLString, rootNodeObject);
  XMLString += "</map>";

  window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
  window.requestFileSystem(window.TEMPORARY, 1024 * 1024, function (fs) {

    fs.root.getFile('testmap1.mm', {create: true}, function (fileEntry) {

      fileEntry.createWriter(function (fileWriter) {
        fileWriter.truncate(0);
      }, function () {
      });

      fileEntry.createWriter(function (fileWriter) {
        var blob = new Blob([XMLString]);
        fileWriter.write(blob);
        fileWriter.addEventListener("writeend", function () {
          location.href = fileEntry.toURL();
        }, false);
      }, function () {
      });
    }, function () {
    });
  }, function () {
  });

});

Mousetrap.bind('mod+left', debounce(250, true,
  function () {
    var selection = d3.select(".node.selected")[0][0];
    if (selection) {
      var data = selection.__data__;
      var dir = App.getDirection(data),
        parent = data.parent,
        selectedNode,
        target,
        direction;

      function pasteAfterCut() {
        if (target.isCollapsed) {
          App.expandRecursive(target, target._id);
          App.removeLocally(target._id);
        }
        if (direction == "right")
          selectedNode = App.pasteNode(data, target, direction, parent);
        else
          selectedNode = App.pasteNode(data, target, direction);
        App.retainCollapsed();
        App.selectNode(selectedNode);
      }

      switch (dir) {
        case('right'):
          App.cutNode(function () {
            if (App.getDirection(parent) === 'root') {
              if (data.hasOwnProperty('isCollapsed') && data.isCollapsed)
                App.removeLocally(data._id);
              selectedNode = App.pasteNode(data, parent, "left");
              App.retainCollapsed();
              App.selectNode(selectedNode);
              return;

            }
            else {
              target = parent.parent;
              direction = "right";
              pasteAfterCut();
            }
          });

          break;
        case('root'):
          alert("Root cannot be added to a new parent");
          break;
        case('left'):
          var nl = parent.children || [], i = 0;
          if (parent[dir]) {
            nl = parent[dir];
          }
          var l = nl.length;
          for (; i < l; i++) {
            if (nl[i]._id === data._id && l != 1) {
              if (i === 0)
                target = nl[(i + 1)];
              else
                target = nl[(i - 1)];
              direction = "left";
              App.cutNode(pasteAfterCut);
              break;
            }

          }
          break;
        default:
          break;
      }
    }
  }));

Mousetrap.bind('mod+right', debounce(250, true,
  function () {
    var selection = d3.select(".node.selected")[0][0],
      selectedNode,
      target,
      direction;


    if (selection) {
      var data = selection.__data__;
      var dir = App.getDirection(data),
        parent = data.parent;

      function pasteAfterCut() {
        if (target.isCollapsed) {
          App.expandRecursive(target, target._id);
          App.removeLocally(target._id);
        }
        if (direction == "left")
          selectedNode = App.pasteNode(data, target, direction, parent);
        else
          selectedNode = App.pasteNode(data, target, direction);
        App.retainCollapsed();
        App.selectNode(selectedNode);
      }

      switch (dir) {
        case('left'):
          App.cutNode(function () {
            if (App.getDirection(parent) === 'root') {
              if (data.hasOwnProperty('isCollapsed') && data.isCollapsed)
                App.removeLocally(data._id);
              selectedNode = App.pasteNode(data, parent, "right");
              App.retainCollapsed();
              App.selectNode(selectedNode);
              return;
            }
            else {
              target = parent.parent;
              direction = "left";
              pasteAfterCut();
            }
          });

          break;
        case('root'):
          alert("Root cannot be added to a new parent");
          break;
        case('right'):
          var nl = parent.children || [], i = 0;
          if (parent[dir]) {
            nl = parent[dir];
          }
          var l = nl.length;
          for (; i < l; i++) {
            if (nl[i]._id === data._id && l != 1) {
              if (i === 0)
                target = nl[(i + 1)];
              else
                target = nl[(i - 1)];
              direction = "right";
              App.cutNode(pasteAfterCut);
              break;
            }
          }
          break;
        default:
          break;
      }

    }
  }));

Mousetrap.bind('mod+up', debounce(250, true,
  function () {
    var selection = d3.select(".node.selected")[0][0].__data__;

    if (!(selection && selection.parent))
      return;

    var previousSibling,
      siblings = selection.parent[selection.position] || selection.parent.children,
      parent = selection.parent;
    if (siblings.length <= 1) return;
    if (selection.previous) {

      if (parent[selection.position]) {
        siblings = parent[selection.position];
      }
      var l = siblings.length;
      if (l == 1)
        return;
      for (var i = 0; i < l; i++) {
        if (siblings[i]._id === selection._id) {
          previousSibling = siblings[i - 1];
          break;
        }
      }
      if (previousSibling.previous) {
        previousSibling = siblings.find(function (x) {
          return x._id == previousSibling.previous
        });
      }
      else {
        App.selectNode(previousSibling);
        App.cutNode(function (err, data) {
          App.pasteNode(previousSibling, selection.parent, selection.position, selection);
          App.retainCollapsed();
          App.selectNode(selection);
        });
        return;
      }
    } else {
      previousSibling = siblings[siblings.length - 1];
    }
    App.cutNode(function (err, data) {
      var selectedNode = App.pasteNode(selection, selection.parent, selection.position, previousSibling);
      App.retainCollapsed();
      App.selectNode(selectedNode);
    });
  }));

Mousetrap.bind('mod+down', debounce(250, true,
  function () {
    var selection = d3.select(".node.selected")[0][0].__data__;

    if (!(selection && selection.parent))
      return;

    var nextSibling,
      siblings = selection.parent[selection.position] || selection.parent.children;
    if (siblings.length <= 1) return;
    if (selection.next) {
      nextSibling = siblings.find(function (x) {
        return x._id == selection.next;
      });

    }
    else {
      var newNode = {
        name: selection.name, position: selection.position,
        parent_ids: selection.parent_ids,
        previous: null, next: siblings[0]._id
      };
      App.cutNode(function () {
        var headId = siblings[0]._id;
        newNode._id = mindMapService.addNode(newNode);
        if (selection.hasOwnProperty('isCollapsed') && selection.isCollapsed) {
          newNode.isCollapsed = selection.isCollapsed;
          App.storeLocally(newNode);
        }

        mindMapService.updateNode(headId, {previous: newNode._id});
        var previous = null;
        (selection.children || selection._children || []).forEach(function (child) {
          previous = App.pasteNode(child, newNode, child.position, previous);
        });

        App.retainCollapsed();
        App.selectNode(newNode);
      });
      return;
    }

    App.cutNode(function () {
      var selectedNode = App.pasteNode(selection, selection.parent, selection.position, nextSibling);
      App.retainCollapsed();
      App.selectNode(selectedNode);
    });
  }));

Mousetrap.bind("esc", function goToRootNode() {
  App.select(d3.select('.node.level-0')[0][0]);
  App.getChartInFocus();
});

Mousetrap.bind('?', function showHelp() {
  $('#help-modal').modal('show');
});