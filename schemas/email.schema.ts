export interface EmailOptionsInput {
  receipentEmail: string;
  receipentName: string;
  key: string;
  additionalInfo: {
    emailToken?: string;
  };
}

export interface EmailOptions {
  from: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
}
