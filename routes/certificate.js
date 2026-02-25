// routes/certificate.js
const express = require("express");
const qrcode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const Certificate = require("../models/certificateModel");
const path = require("path"); // Added for serving static files

async function computeCertNo(req, res, next) {
	try {

		const last = await Certificate.findOne().sort({ _id: -1 });


		const count = last ? last.count + 1 : 1;
		req.count = count;
		req.certificateNo = `certificate_${count}`;
		req.welderId = `w-${count}`;



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

			next();
		},
		upload, // <— Use the pre-configured upload middleware
		async (req, res, next) => {
			try {


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


				// Check if FRONTEND_URL is configured
				if (!process.env.FRONTEND_URL) {
					console.warn('FRONTEND_URL environment variable is not set');
				}

				// generate QR code in-memory:
				const viewUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/certificate/view/${req.certificateNo}`;


				const qrDataUri = await qrcode.toDataURL(viewUrl, {
					margin: 1,
					width: 200,
				});


				// upload QR under same folder, named cert-<id>-qr
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `certificates/${req.certificateNo}`,
					public_id: `cert-${req.certificateNo}-qr`,
					overwrite: true,
				});


				// Process dynamic attributes
				let attributes = [];
				if (req.body.attrKeys) {
					const keys = Array.isArray(req.body.attrKeys) ? req.body.attrKeys : [req.body.attrKeys];
					const values = Array.isArray(req.body.attrValues) ? req.body.attrValues : [req.body.attrValues];
					const ranges = Array.isArray(req.body.attrRanges) ? req.body.attrRanges : [req.body.attrRanges];

					attributes = keys.map((key, index) => ({
						key: key,
						value: values[index] || '',
						range: ranges[index] || ''
					})).filter(attr => attr.key && attr.key.trim() !== '');
				}

				// Prepare certificate data
				const certificateData = {
					...req.body,
					attributes,
					count: req.count,
					certificateNo: req.certificateNo,
					tempCertificateNo: req.body.tempCertificateNo || req.certificateNo,
					welderId: req.welderId,
					profilePic: profileImageUrl,
					qrLink: qrUpload.secure_url,
				};



				// save to Mongo:
				const savedCertificate = await Certificate.create(certificateData);


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

			next();
		},
		upload, // <— Use the pre-configured upload middleware
		async (req, res, next) => {
			try {
				const certNo = req.params.certificateNo;


				// Check for upload errors
				if (req.fileError) {
					throw new Error(`File upload error: ${req.fileError.message}`);
				}

				// Process dynamic attributes
				let attributes = [];
				if (req.body.attrKeys) {
					const keys = Array.isArray(req.body.attrKeys) ? req.body.attrKeys : [req.body.attrKeys];
					const values = Array.isArray(req.body.attrValues) ? req.body.attrValues : [req.body.attrValues];
					const ranges = Array.isArray(req.body.attrRanges) ? req.body.attrRanges : [req.body.attrRanges];

					attributes = keys.map((key, index) => ({
						key: key,
						value: values[index] || '',
						range: ranges[index] || ''
					})).filter(attr => attr.key && attr.key.trim() !== '');
				}

				const updates = { ...req.body, attributes, certificateNo: certNo };
				if (!updates.tempCertificateNo) {
					updates.tempCertificateNo = certNo;
				}

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
