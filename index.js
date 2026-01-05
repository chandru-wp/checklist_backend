require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth");
const checklistRoutes = require("./routes/checklist");
const templateRoutes = require("./routes/templates");

app.use("/api/auth", authRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/templates", templateRoutes);

app.listen(5000, () => console.log("Server running on 5000"));
