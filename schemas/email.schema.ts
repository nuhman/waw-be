export interface EmailOptionsInput {
  receipentEmail: string;
  receipentName: string;
  key: string;
  additionalInfo: {
    [key: string]: string | number | object | undefined;
  };
}

export interface EmailOptions {
  from: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
}
