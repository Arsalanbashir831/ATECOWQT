// routes/card.js
const express = require("express");
const qrcode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const Card = require("../models/cardModel");

// before Multer runs, assign req.card_no & req.count
async function computeCardNo(req, res, next) {
	const last = await Card.findOne().sort({ _id: -1 });
	const count = last ? last.count + 1 : 1;
	req.count = count;
	req.card_no = `c-${count}`;
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
	router.get("/", (req, res) => res.render("insertCard"));

	// INSERT
	router.post(
		"/insert",
		computeCardNo, // sets req.card_no, req.count
		upload.single("card"), // uses uploadCard
		async (req, res, next) => {
			try {
				// 1) get the full HTTPS URL of the uploaded photo
				const imageUrl = req.file.path;

				// 2) generate QR data URI and upload
				const viewLink = `${process.env.FRONTEND_URL}/card/view/${req.card_no}`;
				const qrDataUri = await qrcode.toDataURL(viewLink, {
					width: 200,
					margin: 1,
				});
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `cards/${req.card_no}`,
					public_id: `card-${req.card_no}-qr`,
					overwrite: true,
				});

				// 3) create the Card with real URLs
				let cardData = { ...req.body };
				if (cardData.tableData && typeof cardData.tableData === 'string') {
					try {
						cardData.tableData = JSON.parse(cardData.tableData);
            // Inject the generated Card No into the table (Row 0, Col 1)
            if (cardData.tableData.rows && cardData.tableData.rows.length > 0) {
                 cardData.tableData.rows[0][1] = req.card_no;
            }
					} catch (e) {
						console.error('Failed to parse tableData', e);
					}
				}

				const card = await Card.create({
					...cardData,
					tableData: cardData.tableData,
					count: req.count,
					card_no: req.card_no,
					image: imageUrl,
					qr: qrUpload.secure_url,
				});

				res.render("viewCard", { record: card });
			} catch (err) {
				next(err);
			}
		}
	);

	// EDIT
	router.get("/edit/:card_no", async (req, res) => {
		let card_no = req.params.card_no;
		const record = await Card.findOne({ card_no: card_no }).exec();
		console.log(record);
		if (record) {
			res.render("editCard", { record: record });
		} else {
			res.status(404).json({ Status: "FAILED" });
		}
	});

	// VIEW
	router.get("/view/:card_no", async (req, res, next) => {
		try {
			const record = await Card.findOne({ card_no: req.params.card_no });
			if (!record) return res.status(404).send("Not found");
			res.render("viewCard", { record });
		} catch (err) {
			next(err);
		}
	});

	// UPDATE
	router.post(
		"/update/:card_no",
		setCardNoFromParam,
		upload.single("card"),
		async (req, res, next) => {
			try {
				const cn = req.params.card_no;
				const updates = { ...req.body, card_no: cn };

				if (req.file) updates.image = req.file.path;

				const viewLink = `${process.env.FRONTEND_URL}/card/view/${cn}`;
				const qrDataUri = await qrcode.toDataURL(viewLink, {
					width: 200,
					margin: 1,
				});
				const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
					folder: `cards/${cn}`,
					public_id: `card-${cn}-qr`,
					overwrite: true,
				});
				updates.qr = qrUpload.secure_url;

				// preserve count only, welder_id comes from payload
				const existing = await Card.findOne({ card_no: cn });
				updates.count = existing.count;

				if (updates.tableData && typeof updates.tableData === 'string') {
					try {
						updates.tableData = JSON.parse(updates.tableData);
            // Inject the Card No into the table (Row 0, Col 1) to ensure consistency
            if (updates.tableData.rows && updates.tableData.rows.length > 0) {
                 updates.tableData.rows[0][1] = cn;
            }
					} catch (e) {
						console.error('Failed to parse tableData', e);
					}
				}

				await Card.findOneAndUpdate({ card_no: cn }, updates, { new: true });
				res.redirect(`/card/view/${cn}`);
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
			await cloudinary.uploader.destroy(`cards/${cn}/card-${cn}`, {
				resource_type: "image",
			});
			// destroy the QR
			await cloudinary.uploader.destroy(`cards/${cn}/card-${cn}-qr`, {
				resource_type: "image",
			});
			// now delete the (now empty) folder
			await cloudinary.api.delete_folder(`cards/${cn}`);

			// finally remove the DB record
			await Card.findOneAndDelete({ card_no: cn });

			res.redirect("/supervisor");
		} catch (err) {
			console.error("Cloudinary delete failed:", err);
			next(err);
		}
	});

	return router;
};
