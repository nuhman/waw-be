import nodemailer, { Transporter } from "nodemailer";
import fs from "fs";
import path from "path";
import { EmailOptionsInput, EmailOptions } from "../schemas/email.schema.js";
import Handlebars from "handlebars";

import { fileURLToPath } from "url";

// Convert the import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to create and return an email transporter
export const getEmailTransporter = (): Transporter<any> | null => {
  try {
    // Currently using `google` smtp server service,
    // So we can skip keys like "host", "port" etc.
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.GMAIL_APP_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    return transporter;
  } catch (error) {
    return null;
  }
};

// Function to send an email
export const sendEmail = async (
  transporter: Transporter<any> | null,
  emailOptions: {}
) => {
  try {
    await transporter?.sendMail(emailOptions);
  } catch (err) {
    throw err;
  }
};

const fetchEmailTemplate = (
  templateName: string,
  templateData: {
    [key: string]: string;
  }
): string => {
  // Load the email template
  // Correctly build the path to your template
  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    `${templateName}.html`
  );
  const source = fs.readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(source);
  return template(templateData);
};

const fetchEmailVerificationHtml = (
  name: string,
  verificationToken?: string,
  tokenValidityInMinutes?: string
): string => {
  try {
    return fetchEmailTemplate("emailverification", {
      name,
      verificationToken: verificationToken || "",
      tokenValidityInMinutes: tokenValidityInMinutes || "1",
    });
  } catch (err) {
    console.log(err);
    return `Thanks for registering with WAW schedule management service! Use the following code to complete the email verification process: ${verificationToken}`;
  }
};

export const formatEmailOptions = (options: EmailOptionsInput) => {
  const emailOptions: EmailOptions = {
    from: `"${process.env.APP_NAME}" <${process.env.GMAIL_APP_USER}>`,
    to: options.receipentEmail,
  };
  switch (options.key) {
    case "ev":
      emailOptions.subject = `Code to verify your WAW email: ${options.additionalInfo.emailToken}`;
      emailOptions.text = `Thanks for registering with WAW schedule management service! Use the following code to complete the email verification process: ${options.additionalInfo.emailToken}`;
      emailOptions.html = fetchEmailVerificationHtml(
        options.receipentName,
        options.additionalInfo.emailToken,
        "1"
      );
      break;
    default:
      break;
  }
  return emailOptions;
};
