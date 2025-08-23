// routes/certificate.js
const express = require("express");
const qrcode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const Certificate = require("../models/certificateModel");
const path = require("path"); // Added for serving static files

async function computeCertNo(req, res, next) {
	try {
		console.log('🔢 Computing certificate number...');
		const last = await Certificate.findOne().sort({ _id: -1 });
		console.log('Last certificate found:', last ? last.certificateNo : 'None');
		
		const count = last ? last.count + 1 : 1;
		req.count = count;
		req.certificateNo = `certificate_${count}`;
		req.welderId = `w-${count}`;
		
		console.log('Generated certificate details:', {
			count: req.count,
			certificateNo: req.certificateNo,
			welderId: req.welderId
		});
		
		next();
	} catch (error) {
		console.error('Error in computeCertNo:', error);
		next(error);
	}
}

function setCertNoFromParam(req, res, next) {
	req.certificateNo = req.params.certificateNo;
	next();
}

module.exports = (upload) => {
	const router = express.Router();

	// show the form
	router.get("/", (req, res) => res.render("insertCertificate"));

	// test form for debugging
	router.get("/test", (req, res) => {
		res.sendFile(path.join(__dirname, '../test-form.html'));
	});

	// upload test form
	router.get("/upload-test", (req, res) => {
		res.sendFile(path.join(__dirname, '../upload-test.html'));
	});

	// test upload endpoint
	router.post("/test-upload", upload, (req, res) => {
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
		computeCertNo, // <— sets req.certificateNo, req.count, req.welderId
		(req, res, next) => {
			console.log('📁 About to process file upload...');
			console.log('Certificate number for upload:', req.certificateNo);
			console.log('Request headers:', req.headers['content-type']);
			next();
		},
		upload, // <— Use the pre-configured upload middleware
		async (req, res, next) => {
			try {
				console.log('Certificate insertion started for:', req.certificateNo);
				console.log('Request body:', req.body);
				console.log('File uploaded:', req.file);

				// Check for upload errors
				if (req.fileError) {
					throw new Error(`File upload error: ${req.fileError.message}`);
				}

				// Validate required fields
				if (!req.body.clientName || !req.body.welderName) {
					throw new Error('Client name and welder name are required');
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
				const viewUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/certificate/view/${req.certificateNo}`;
				console.log('View URL for QR:', viewUrl);
				
				const qrDataUri = await qrcode.toDataURL(viewUrl, {
					margin: 1,
					width: 200,
				});
				console.log('QR code generated successfully');

				// upload QR under same folder, named cert-<id>-qr
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `certificates/${req.certificateNo}`,
					public_id: `cert-${req.certificateNo}-qr`,
					overwrite: true,
				});
				console.log('QR code uploaded to Cloudinary:', qrUpload.secure_url);

				// Prepare certificate data
				const certificateData = {
					...req.body,
					count: req.count,
					certificateNo: req.certificateNo,
					welderId: req.welderId,
					profilePic: profileImageUrl,
					qrLink: qrUpload.secure_url,
				};

				console.log('Certificate data to save:', certificateData);

				// save to Mongo:
				const savedCertificate = await Certificate.create(certificateData);
				console.log('Certificate saved successfully:', savedCertificate._id);

				res.redirect(`/certificate/view/${req.certificateNo}`);
			} catch (err) {
				console.error('Error in certificate insertion:', err);
				console.error('Error stack:', err.stack);
				next(err);
			}
		}
	);

	// VIEW
	router.get("/view/:certificateNo", async (req, res, next) => {
		try {
			const record = await Certificate.findOne({
				certificateNo: req.params.certificateNo,
			});
			if (!record) return res.status(404).send("Not found");
			console.log("➡️ record.profileImageUrl =", record);
			res.render("viewCertificate", { record });
		} catch (err) {
			next(err);
		}
	});

	// UPDATE (render edit form)
	router.post(
		"/edit/:certificateNo",
		setCertNoFromParam,
		async (req, res, next) => {
		  try {
			const certNo = req.params.certificateNo;
			const record = await Certificate.findOne({ certificateNo: certNo });
			if (!record) return res.status(404).send("Certificate not found");
			res.render("EditCertificate", { record });
		  } catch (err) {
			next(err);
		  }
		}
	  );
	// UPDATE (apply changes)
	router.post(
		"/update/:certificateNo",
		(req, res, next) => {
			console.log('📁 About to process update file upload...');
			console.log('Certificate number for update:', req.params.certificateNo);
			next();
		},
		upload, // <— Use the pre-configured upload middleware
		async (req, res, next) => {
			try {
				const certNo = req.params.certificateNo;
				console.log('Certificate update started for:', certNo);
				console.log('Request body:', req.body);
				console.log('File uploaded:', req.file);

				// Check for upload errors
				if (req.fileError) {
					throw new Error(`File upload error: ${req.fileError.message}`);
				}

				const updates = { ...req.body, certificateNo: certNo };

				// 1) New profile? storage will overwrite the old asset with the same public_id:
				if (req.file) {
					updates.profilePic = req.file.path;
				}

				// 2) Regenerate & re-upload QR with overwrite:
				const viewUrl = `${process.env.FRONTEND_URL}/certificate/view/${certNo}`;
				const qrDataUri = await qrcode.toDataURL(viewUrl, {
					margin: 1,
					width: 200,
				});
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `certificates/${certNo}`,
					public_id: `cert-${certNo}-qr`,
					overwrite: true,
				});
				updates.qrLink = qrUpload.secure_url;

				// 3) Preserve only count
				const existing = await Certificate.findOne({ certificateNo: certNo });
				updates.count = existing.count;

				// 4) Apply the update
				await Certificate.findOneAndUpdate({ certificateNo: certNo }, updates, {
					new: true,
				});

				res.redirect(`/certificate/view/${certNo}`);
			} catch (err) {
				next(err);
			}
		}
	);

	// DELETE
	router.get("/delete/:certificateNo", async (req, res, next) => {
		try {
			const certNo = req.params.certificateNo;

			// 1) remove both profile + qr from Cloudinary
			await cloudinary.api.delete_resources(
				[
					`certificates/${certNo}/cert-${certNo}`, // profile image
					`certificates/${certNo}/cert-${certNo}-qr`, // QR code
				],
				{ resource_type: "image" }
			);

			// 2) optionally delete the empty folder
			await cloudinary.api.delete_folder(`certificates/${certNo}`);

			// 3) remove from Mongo
			await Certificate.findOneAndDelete({ certificateNo: certNo });

			res.redirect("/supervisor");
		} catch (err) {
			next(err);
		}
	});

	return router;
};
