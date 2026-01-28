import { Router } from "express";
import sendMail from "../../node_mailer/index.js";

const portfolioRouter = Router();

portfolioRouter.get("/health", (req, res) => {
    res.send("Healthy");
});

portfolioRouter.post("/sendMail", async (req, res) => {
    try {
        const { email, name, message } = req.body;

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).send({
                success: false,
                message: "Invalid email format",
            });
        }

        if (!name || !message) {
            return res.status(400).send({
                success: false,
                message: "Name and message are required",
            });
        }

        const mail = await sendMail({ from: email, subject: name, text: message });
        console.log(mail);

        res.status(200).send({
            success: true,
            message: "Mail sent successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Error occurred while sending mail",
        });
    }
});

export default portfolioRouter;
