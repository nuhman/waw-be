import nodemailer, { Transporter } from "nodemailer";
import fs from "fs";
import path from "path";
import { EmailOptionsInput, EmailOptions } from "../schemas/email.schema.js";
import Handlebars from "handlebars";

import { fileURLToPath } from "url";

// `__dirname` is not defined in ESM modules - this is a workaround
// Convert the import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and return an email transporter
 *
 * @returns {Transporter<any> | null>} transporter object created from appropriate environment variables, if possible. Null  otherwise.
 */
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

/**
 * Send email using the given transporter
 * @param transporter object that contains the sendMail function to send emails
 * @param emailOptions object that contain options used to send the email
 * @exception throw errors
 */
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

/**
 * Fetch Generic Email Template
 * @param templateName name of the html file present inside "templates" folder
 * @param templateData key-value pair that will get substituted in the template
 */
const fetchEmailTemplate = (
  templateName: string,
  templateData: {
    [key: string]: string;
  }
): string => {
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

/**
 * Fetch Specific Email Template: Email Verification
 * @param verificationToken code used to verify Email
 * @param tokenValidityInMinutes how long the code is valid for in minutes
 * @exception send back a simple html text
 */
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
    return `<p>Thanks for registering with WAW schedule management service!</p> <p>Use the following code to complete the email verification process: <b>${verificationToken}</b></p>`;
  }
};

/**
 * Method used to format and return email options that will be used by clients to send email
 * @param options email options
 */
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
