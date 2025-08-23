require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");

// ––– Cloudinary & Multer setupss –––
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
	console.error('Missing Cloudinary environment variables. Please check your .env file.');
	console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test Cloudinary connection
cloudinary.api.ping()
	.then(() => console.log('Cloudinary connection successful'))
	.catch(err => console.error('Cloudinary connection failed:', err));

// --- certificates storage+upload ---
const certStorage = new CloudinaryStorage({
	cloudinary,
	params: async (req, file) => {
		try {
			if (!req.certificateNo) {
				throw new Error('Certificate number not set in request');
			}
			return {
				folder: `certificates/${req.certificateNo}`,
				public_id: `cert-${req.certificateNo}`,
				format: "jpg",
				overwrite: true,
				resource_type: "image",
			};
		} catch (error) {
			console.error('Error in Cloudinary storage params:', error);
			throw error;
		}
	},
});
const uploadCert = multer({ 
	storage: certStorage,
	fileFilter: (req, file, cb) => {
		console.log('Processing file:', file.originalname, 'Type:', file.mimetype);
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('Only image files are allowed'), false);
		}
	},
	limits: {
		fileSize: 5 * 1024 * 1024 // 5MB limit
	}
});

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
// note: we'll inject `upload` into the certificate router
const certificateRouter = require("./routes/certificate")(uploadCert);
const cardRouter = require("./routes/card")(uploadCard);
const apiRouter = require("./routes/api");

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/report", reportRouter);
app.use("/certificate", certificateRouter);
app.use("/card", cardRouter);
app.use("/api", apiRouter);

// catch 404
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler middleware
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// log the error
	console.error('Error:', err);

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

// connect to Mongo and start server
if (!process.env.DB) {
	console.error('Missing MongoDB connection string. Please check your .env file.');
	console.error('Required: DB (MongoDB connection string)');
	process.exit(1);
}

mongoose
	.connect(process.env.DB)
	.then(() => {
		console.log("Connected to MongoDB");
		
		// Try to start server with better error handling
		const startServer = (port) => {
			app.listen(port, () => {
				console.log(`Server running on port ${port}`);
			}).on('error', (err) => {
				if (err.code === 'EADDRINUSE') {
					console.log(`Port ${port} is busy, trying port ${port + 1}...`);
					startServer(port + 1);
				} else {
					console.error('Server error:', err);
				}
			});
		};
		
		const port = process.env.PORT || 4200;
		startServer(port);
	})
	.catch((err) => {
		console.error('MongoDB connection failed:', err);
		process.exit(1);
	});

module.exports = app;
