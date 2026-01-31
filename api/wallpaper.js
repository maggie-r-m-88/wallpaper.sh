// api/wallpaper.js
const IMAGES = [
  "https://img.freepik.com/free-vector/colorful-creepy-creatures-illustration-background_516247-1.jpg?w=2000",
  "https://picography.co/wp-content/uploads/2024/06/picography-bird-street-art-768x528.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/2048px-Fronalpstock_big.jpg",
  "https://img.freepik.com/free-photo/aesthetic-retro-vaporwave-landscape_23-2148949194.jpg?w=2000"
];

module.exports = (req, res) => {
  const image = IMAGES[Math.floor(Math.random() * IMAGES.length)];
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(302, { Location: image });
  res.end();
};
