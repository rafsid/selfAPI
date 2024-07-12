const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const LOCAL_SERVER_URL = "http://localhost:3000/api/chat";

app.post("/proxy", async (req, res) => {
  try {
    const response = await axios.post(LOCAL_SERVER_URL, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer YOUR_TOKEN_HERE",
        Accept: "*/*",
        "User-Agent": "Thunder Client (https://www.thunderclient.com)",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: error.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
