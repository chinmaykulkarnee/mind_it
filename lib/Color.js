Color = {};

Color.getColorCode = function (onlineUserSequenceNumber) {
    return Color.colorMap[onlineUserSequenceNumber % Color.colorMap.length].code;
};

Color.colorMap = [
    {color: "red", code: "#d82735", isAssigned: false},
    {color: "green", code: "#009e47", isAssigned: false},
    // {color: "yellow", code: "#fff735", isAssigned: false},
    // {color: "blue", code: "#0079e7", isAssigned: false},
    // {color: "orange", code: "#ff7435", isAssigned: false},
    // {color: "purple", code: "#7d3cb5", isAssigned: false},
    // {color: "brown", code: "#f4a460", isAssigned: false},
    // {color: "deep purple", code: "#551a8b", isAssigned: false},
    // {color: "teal", code: "#008080", isAssigned: false}
];