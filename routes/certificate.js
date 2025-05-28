// routes/certificate.js
const express = require("express");
const qrcode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const Certificate = require("../models/certificateModel");

async function computeCertNo(req, res, next) {
	const last = await Certificate.findOne().sort({ _id: -1 });
	const count = last ? last.count + 1 : 1;
	req.count = count;
	req.certificateNo = `certificate_${count}`;
	req.welderId = `w-${count}`;
	next();
}

function setCertNoFromParam(req, res, next) {
	req.certificateNo = req.params.certificateNo;
	next();
}

module.exports = (upload) => {
	const router = express.Router();

	// show the form
	router.get("/", (req, res) => res.render("insertCertificate"));

	// handle insert
	router.post(
		"/insert",
		computeCertNo, // <— sets req.certificateNo, req.count, req.welderId
		upload.single("profile"), // <— CloudinaryStorage uses req.certificateNo
		async (req, res, next) => {
			try {
				// Cloudinary URL for profile:
				const profileImageUrl = req.file.path;

				// generate QR code in-memory:
				const viewUrl = `${process.env.FRONTEND_URL}/certificate/view/${req.certificateNo}`;
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

				// save to Mongo:
				await Certificate.create({
					...req.body,
					count: req.count,
					certificateNo: req.certificateNo,
					welderId: req.welderId,
					profilePic: req.file.path,
					qrLink: qrUpload.secure_url,
				});

				res.redirect(`/certificate/view/${req.certificateNo}`);
			} catch (err) {
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
		"/update/:certificateNo",
		setCertNoFromParam, // ← ensure req.certificateNo is set
		upload.single("profile"), // now storage.params sees req.certificateNo
		async (req, res, next) => {
			try {
				const certNo = req.params.certificateNo;
				const updates = { ...req.body, certificateNo: certNo };

				// 1) If there’s a new profile, Multer+Storage will overwrite
				if (req.file) {
					updates.profilePic = req.file.path;
				}

				// 2) Regenerate QR
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

				// 3) Preserve count & welderId
				const existing = await Certificate.findOne({ certificateNo: certNo });
				updates.count = existing.count;
				updates.welderId = existing.welderId;

				// 4) Write it back
				await Certificate.findOneAndUpdate({ certificateNo: certNo }, updates, {
					new: true,
				});

				res.redirect(`/certificate/view/${certNo}`);
			} catch (err) {
				next(err);
			}
		}
	);

	// UPDATE (apply changes)
	router.post(
		"/update/:certificateNo",
		upload.single("profile"),
		async (req, res, next) => {
			try {
				const certNo = req.params.certificateNo;
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

				// 3) Preserve count & welderId
				const existing = await Certificate.findOne({ certificateNo: certNo });
				updates.count = existing.count;
				updates.welderId = existing.welderId;

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
