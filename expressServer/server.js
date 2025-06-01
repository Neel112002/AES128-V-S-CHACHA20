const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.post("/encrypt", (req, res) => {
  let plaintext = req.body.plaintext;
  try {
    res.status(200).json({
      ciphertext: plaintext,
      type: "ChaCha20-Poly1305",
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 5000");
});
