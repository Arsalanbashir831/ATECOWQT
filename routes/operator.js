// routes/operator.js
const express = require("express");
const qrcode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const Operator = require("../models/operatorModel");
const path = require("path");

async function computeOperatorNo(req, res, next) {
	try {
		console.log('🔢 Computing operator number...');
		const last = await Operator.findOne().sort({ _id: -1 });
		console.log('Last operator found:', last ? last.operatorNo : 'None');

		// Derive a safe previous count, even if last.count is missing/invalid
		let prevCount = 0;
		if (last && Number.isFinite(Number(last.count))) {
			prevCount = Number(last.count);
		} else {
			const total = await Operator.countDocuments();
			prevCount = Number.isFinite(total) ? total : 0;
		}
		const count = prevCount + 1;
		req.count = count;
		// Always compute operatorNo for internal use (QR/storage)
		req.operatorNo = req.operatorNo || `operator_${count}`;
		// Auto-generate certificateNo in c-count format
		req.certificateNo = `c-${count}`;

		// Respect manual operatorId if provided; fallback to generated
		if (!req.body) req.body = {};
		req.operatorId = req.body.operatorId && req.body.operatorId.trim() !== ''
			? req.body.operatorId.trim()
			: `W-${count}`;
		
		// Inject auto-generated value into body
		req.body.certificateNo = req.certificateNo;

		console.log('Generated operator details:', {
			count: req.count,
			operatorNo: req.operatorNo,
			operatorId: req.operatorId,
			certificateNo: req.certificateNo
		});
		
		next();
	} catch (error) {
		console.error('Error in computeOperatorNo:', error);
		next(error);
	}
}

function setOperatorNoFromParam(req, res, next) {
	req.operatorNo = req.params.operatorNo;
	next();
}

module.exports = (upload) => {
	const router = express.Router();

	// show the form
	router.get("/", (req, res) => res.render("insertOperator"));

	// test form for debugging
	router.get("/test", (req, res) => {
		res.sendFile(path.join(__dirname, '../test-operator-form.html'));
	});

	// upload test form
	router.get("/upload-test", (req, res) => {
		res.sendFile(path.join(__dirname, '../upload-test.html'));
	});

	// test upload endpoint
	router.post("/test-upload", upload.single('profile'), (req, res) => {
		try {
			console.log('Test upload - File:', req.file);
			console.log('Test upload - Body:', req.body);
			console.log('Test upload - File error:', req.fileError);
			
			if (req.fileError) {
				return res.status(400).json({
					error: 'Upload failed',
					message: req.fileError.message
				});
			}
			
			if (!req.file) {
				return res.status(400).json({
					error: 'No file uploaded',
					message: 'Please select a file to upload'
				});
			}
			
			res.json({
				success: true,
				file: {
					originalname: req.file.originalname,
					filename: req.file.filename,
					path: req.file.path,
					size: req.file.size,
					mimetype: req.file.mimetype
				}
			});
		} catch (error) {
			console.error('Test upload error:', error);
			res.status(500).json({
				error: 'Server error',
				message: error.message
			});
		}
	});

	// handle insert
	router.post(
		"/insert",
		computeOperatorNo, // <— sets req.operatorNo, req.count, and respects manual operatorId
		(req, res, next) => {
			console.log('📁 About to process file upload...');
			console.log('Operator number for upload:', req.operatorNo);
			console.log('Request headers:', req.headers['content-type']);
			next();
		},
		upload.single('profile'), // <— Use the pre-configured upload middleware
		async (req, res, next) => {
			try {
				console.log('Operator insertion started for:', req.operatorNo);
				console.log('Request body:', req.body);
				console.log('File uploaded:', req.file);

				// Check for upload errors
				if (req.fileError) {
					throw new Error(`File upload error: ${req.fileError.message}`);
				}

				// Validate required fields
				if (!req.body.operatorName) {
					throw new Error('Operator name is required');
				}

				// Validate file upload
				if (!req.file) {
					throw new Error('Profile image is required');
				}

				// Cloudinary URL for profile:
				const profileImageUrl = req.file.path;
				console.log('Profile image URL:', profileImageUrl);

				// Check if FRONTEND_URL is configured
				if (!process.env.FRONTEND_URL) {
					console.warn('FRONTEND_URL environment variable is not set');
				}

				// generate QR code in-memory:
				const viewUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/operator/view/${req.operatorNo}`;
				console.log('View URL for QR:', viewUrl);
				
				const qrDataUri = await qrcode.toDataURL(viewUrl, {
					margin: 1,
					width: 200,
				});
				console.log('QR code generated successfully');

				// upload QR under same folder, named operator-<id>-qr
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `operators/${req.operatorNo}`,
					public_id: `operator-${req.operatorNo}-qr`,
					overwrite: true,
				});
				console.log('QR code uploaded to Cloudinary:', qrUpload.secure_url);

				// Prepare operator data. Keep manual operatorId if supplied.
				const operatorData = {
					count: req.count,
					operatorNo: req.operatorNo,
					profilePic: profileImageUrl,
					qrLink: qrUpload.secure_url,
					...req.body,
					certificateNo: req.certificateNo,
					operatorId: req.body.operatorId && req.body.operatorId.trim() !== ''
						? req.body.operatorId.trim()
						: req.operatorId,
				};

				console.log('Operator data to save:', operatorData);

				// save to Mongo:
				const savedOperator = await Operator.create(operatorData);
				console.log('Operator saved successfully:', savedOperator._id);

				res.redirect(`/operator/view/${req.operatorNo}`);
			} catch (err) {
				console.error('Error in operator insertion:', err);
				console.error('Error stack:', err.stack);
				next(err);
			}
		}
	);

	// VIEW
	router.get("/view/:operatorNo", async (req, res, next) => {
		try {
			const record = await Operator.findOne({
				operatorNo: req.params.operatorNo,
			});
			if (!record) return res.status(404).send("Not found");
			console.log("➡️ record =", record);
			res.render("viewOperator", { record });
		} catch (err) {
			next(err);
		}
	});

	// UPDATE (render edit form)
	router.post(
		"/edit/:operatorNo",
		setOperatorNoFromParam,
		async (req, res, next) => {
		  try {
			const operatorNo = req.params.operatorNo;
			const record = await Operator.findOne({ operatorNo: operatorNo });
			if (!record) return res.status(404).send("Operator not found");
			res.render("EditOperator", { record });
		  } catch (err) {
			next(err);
		  }
		}
	  );

	// UPDATE (apply changes)
	router.post(
		"/update/:operatorNo",
		(req, res, next) => {
			console.log('📁 About to process update file upload...');
			console.log('Operator number for update:', req.params.operatorNo);
			next();
		},
		upload.single('profile'), // <— Use the pre-configured upload middleware
		async (req, res, next) => {
			try {
				const operatorNo = req.params.operatorNo;
				console.log('Operator update started for:', operatorNo);
				console.log('Request body:', req.body);
				console.log('File uploaded:', req.file);

				// Check for upload errors
				if (req.fileError) {
					throw new Error(`File upload error: ${req.fileError.message}`);
				}

				const updates = { ...req.body, operatorNo: operatorNo };

				// 1) New profile? storage will overwrite the old asset with the same public_id:
				if (req.file) {
					updates.profilePic = req.file.path;
				}

				// 2) Regenerate & re-upload QR with overwrite:
				const viewUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/operator/view/${operatorNo}`;
				const qrDataUri = await qrcode.toDataURL(viewUrl, {
					margin: 1,
					width: 200,
				});
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `operators/${operatorNo}`,
					public_id: `operator-${operatorNo}-qr`,
					overwrite: true,
				});
				updates.qrLink = qrUpload.secure_url;

				// 3) Preserve count and certificateNo
				const existing = await Operator.findOne({ operatorNo: operatorNo });
				updates.count = existing.count;
				updates.certificateNo = existing.certificateNo;

				// 4) Apply the update
				await Operator.findOneAndUpdate({ operatorNo: operatorNo }, updates, {
					new: true,
				});

				res.redirect(`/operator/view/${operatorNo}`);
			} catch (err) {
				next(err);
			}
		}
	);

	// DELETE
	router.get("/delete/:operatorNo", async (req, res, next) => {
		try {
			const operatorNo = req.params.operatorNo;

			// 1) remove both profile + qr from Cloudinary
			await cloudinary.api.delete_resources(
				[
					`operators/${operatorNo}/operator-${operatorNo}`, // profile image
					`operators/${operatorNo}/operator-${operatorNo}-qr`, // QR code
				],
				{ resource_type: "image" }
			);

			// 2) optionally delete the empty folder
			await cloudinary.api.delete_folder(`operators/${operatorNo}`);

			// 3) remove from Mongo
			await Operator.findOneAndDelete({ operatorNo: operatorNo });

			res.redirect("/supervisor");
		} catch (err) {
			next(err);
		}
	});

	// LIST all operators
	router.get("/list", async (req, res, next) => {
		try {
			const operators = await Operator.find().sort({ createdAt: -1 });
			res.render("operatorList", { operators });
		} catch (err) {
			next(err);
		}
	});

	return router;
};
