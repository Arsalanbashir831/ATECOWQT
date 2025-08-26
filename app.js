require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const session = require("express-session");

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
			// For certificate insertion, certificateNo should be set by computeCertNo middleware
			// For certificate updates, it comes from the URL parameter
			const certificateNo = req.certificateNo || req.params?.certificateNo || 'temp';
			
			if (!certificateNo || certificateNo === 'temp') {
				console.warn('Certificate number not available, using temporary folder');
			}
			
			return {
				folder: `certificates/${certificateNo}`,
				public_id: `cert-${certificateNo}`,
				format: "jpg",
				overwrite: true,
				resource_type: "image",
			};
		} catch (error) {
			console.error('Error in Cloudinary storage params:', error);
			// Return a fallback configuration instead of throwing
			return {
				folder: 'certificates/temp',
				public_id: `cert-temp-${Date.now()}`,
				format: "jpg",
				overwrite: true,
				resource_type: "image",
			};
		}
	},
});

// Create a custom upload middleware with error handling
const createUploadMiddleware = () => {
	const upload = multer({ 
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

	// Return a middleware that handles errors
	return (req, res, next) => {
		upload.single('profile')(req, res, (err) => {
			if (err) {
				console.error('Upload error:', err);
				req.fileError = err;
				// Don't call next(err) here, let the route handle it
			}
			next();
		});
	};
};

const uploadCert = createUploadMiddleware();

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

// --- operator storage+upload ---
const operatorStorage = new CloudinaryStorage({
	cloudinary,
	params: async (req, file) => ({
		folder: `operators/${req.operatorNo || req.params?.operatorNo || 'temp'}`,
		public_id: `operator-${req.operatorNo || req.params?.operatorNo || 'temp'}`,
		format: "jpg",
		overwrite: true,
		resource_type: "image",
	}),
});
const uploadOperator = multer({ storage: operatorStorage });

// ––– Express app setup –––
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session middleware configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'ateco-super-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'ateco-session'
}));

// serve static for your frontend assets
app.use(express.static(path.join(__dirname, "public")));

// ––– Your routers –––
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const reportRouter = require("./routes/report");
// note: we'll inject `upload` into the certificate router
const certificateRouter = require("./routes/certificate")(uploadCert);
const cardRouter = require("./routes/card")(uploadCard);
const operatorRouter = require("./routes/operator")(uploadOperator);
const apiRouter = require("./routes/api");

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/report", reportRouter);
app.use("/certificate", certificateRouter);
app.use("/card", cardRouter);
app.use("/operator", operatorRouter);
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
