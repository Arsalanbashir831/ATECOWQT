// routes/aasia-steel-card.js
const express = require("express");
const qrcode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const AasiaSteelCard = require("../models/aasiaSteelCardModel");

// before Multer runs, assign req.card_no & req.count
async function computeCardNo(req, res, next) {
	const last = await AasiaSteelCard.findOne().sort({ _id: -1 });
	const count = last ? last.count + 1 : 1;
	req.count = count;
	req.card_no = `asc-${count}`;
	req.welder_id = `w-${count}`;
	next();
}

function setCardNoFromParam(req, res, next) {
	req.card_no = req.params.card_no;
	next();
}

module.exports = (upload) => {
	const router = express.Router();

	// form
	router.get("/", (req, res) => res.render("insertAasiaSteelCard"));

	// INSERT
	router.post(
		"/insert",
		computeCardNo, // sets req.card_no, req.count
		upload, // uses custom upload middleware
		async (req, res, next) => {
			try {
				// Check for file upload errors
				if (req.fileError) {
					console.error('File upload error:', req.fileError);
					return res.status(400).json({ 
						error: 'File upload failed', 
						message: req.fileError.message 
					});
				}

				// Check if file was uploaded
				if (!req.file) {
					return res.status(400).json({ 
						error: 'No file uploaded', 
						message: 'Please select an image file' 
					});
				}

				// 1) get the full HTTPS URL of the uploaded photo
				const imageUrl = req.file.path;

				// 2) generate QR data URI and upload
				const viewLink = `${process.env.FRONTEND_URL}/aasia-steel-card/view/${req.card_no}`;
				const qrDataUri = await qrcode.toDataURL(viewLink, {
					width: 200,
					margin: 1,
				});
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `aasia-steel-cards/${req.card_no}`,
					public_id: `aasia-steel-card-${req.card_no}-qr`,
					overwrite: true,
				});

				// 3) create the AasiaSteelCard with real URLs
                let cardData = { ...req.body };
                if (cardData.tableData && typeof cardData.tableData === 'string') {
                    try {
                        cardData.tableData = JSON.parse(cardData.tableData);
                    } catch (e) {
                        console.error('Failed to parse tableData', e);
                    }
                }

				const card = await AasiaSteelCard.create({
					...cardData, // welder_id comes from payload
					count: req.count,
					card_no: req.card_no,
					image: imageUrl,
					qr: qrUpload.secure_url,
				});

				res.render("viewAasiaSteelCard", { record: card });
			} catch (err) {
				next(err);
			}
		}
	);

	// EDIT
	router.get("/edit/:card_no", async (req, res) => {
		let card_no = req.params.card_no;
		const record = await AasiaSteelCard.findOne({ card_no: card_no }).exec();
		console.log(record);
		if (record) {
			res.render("editAasiaSteelCard", { record: record });
		} else {
			res.status(404).json({ Status: "FAILED" });
		}
	});

	// VIEW
	router.get("/view/:card_no", async (req, res, next) => {
		try {
			const record = await AasiaSteelCard.findOne({ card_no: req.params.card_no });
			if (!record) return res.status(404).send("Not found");
			res.render("viewAasiaSteelCard", { record });
		} catch (err) {
			next(err);
		}
	});

	// UPDATE
	router.post(
		"/update/:card_no",
		setCardNoFromParam,
		upload,
		async (req, res, next) => {
			try {
				// Check for file upload errors
				if (req.fileError) {
					console.error('File upload error:', req.fileError);
					return res.status(400).json({ 
						error: 'File upload failed', 
						message: req.fileError.message 
					});
				}

				const cn = req.params.card_no;
				const updates = { ...req.body, card_no: cn };

				if (req.file) updates.image = req.file.path;

				const viewLink = `${process.env.FRONTEND_URL}/aasia-steel-card/view/${cn}`;
				const qrDataUri = await qrcode.toDataURL(viewLink, {
					width: 200,
					margin: 1,
				});
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `aasia-steel-cards/${cn}`,
					public_id: `aasia-steel-card-${cn}-qr`,
					overwrite: true,
				});
				updates.qr = qrUpload.secure_url;

				// preserve count only, welder_id comes from payload
				const existing = await AasiaSteelCard.findOne({ card_no: cn });
				updates.count = existing.count;

                if (updates.tableData && typeof updates.tableData === 'string') {
                    try {
                        updates.tableData = JSON.parse(updates.tableData);
                    } catch (e) {
                        console.error('Failed to parse tableData', e);
                    }
                }

				await AasiaSteelCard.findOneAndUpdate({ card_no: cn }, updates, { new: true });
				res.redirect(`/aasia-steel-card/view/${cn}`);
			} catch (err) {
				next(err);
			}
		}
	);

	// DELETE
	router.get("/delete/:card_no", async (req, res, next) => {
		const cn = req.params.card_no;

		try {
			// destroy the main photo
			await cloudinary.uploader.destroy(`aasia-steel-cards/${cn}/aasia-steel-card-${cn}`, {
				resource_type: "image",
			});
			// destroy the QR
			await cloudinary.uploader.destroy(`aasia-steel-cards/${cn}/aasia-steel-card-${cn}-qr`, {
				resource_type: "image",
			});
			// now delete the (now empty) folder
			await cloudinary.api.delete_folder(`aasia-steel-cards/${cn}`);

			// finally remove the DB record
			await AasiaSteelCard.findOneAndDelete({ card_no: cn });

			res.redirect("/supervisor");
		} catch (err) {
			console.error("Cloudinary delete failed:", err);
			next(err);
		}
	});

	return router;
};
