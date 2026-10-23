// Coordinates are percentages of the visible cropped frame; shared by preview and guide.
export const presets = Object.freeze([
  {name:'背景重視', x:66, height:66, bottom:3, hint:'人物を右側に。景色も大切に。'},
  {name:'全身', x:50, height:87, bottom:3, hint:'頭と足元をフレームの中に。'},
  {name:'寄り', x:53, height:151, bottom:-57, hint:'顔を大きめに。背景は少し残して。'}
]);
