require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");

// ––– Cloudinary & Multer setup –––
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- certificates storage+upload ---
const certStorage = new CloudinaryStorage({
	cloudinary,
	params: async (req, file) => ({
		folder: `certificates/${req.certificateNo}`,
		public_id: `cert-${req.certificateNo}`,
		format: "jpg",
		overwrite: true,
		resource_type: "image",
	}),
});
const uploadCert = multer({ storage: certStorage });

// --- cards storage+upload ---
const cardStorage = new CloudinaryStorage({
	cloudinary,
	params: async (req, file) => ({
		folder: `cards/${req.card_no}`,
		public_id: `card-${req.card_no}`,
		format: "jpg",
		overwrite: true,
		resource_type: "image",
	}),
});
const uploadCard = multer({ storage: cardStorage });

// ––– Express app setup –––
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// serve static for your frontend assets
app.use(express.static(path.join(__dirname, "public")));

// ––– Your routers –––
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const reportRouter = require("./routes/report");
// note: we’ll inject `upload` into the certificate router
const certificateRouter = require("./routes/certificate")(uploadCert);
const cardRouter = require("./routes/card")(uploadCard);

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/report", reportRouter);
app.use("/certificate", certificateRouter);
app.use("/card", cardRouter);

// catch 404
app.use(function (req, res, next) {
	next(createError(404));
});

// connect to Mongo and start server
mongoose
	.connect(process.env.DB)
	.then(() => {
		console.log("Connected to MongoDB");
		app.listen(4200, () => console.log("Server running on port 4200"));
	})
	.catch((err) => console.error(err));

module.exports = app;
