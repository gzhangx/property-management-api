import { getBootSec } from "./bootSec";

import { EmailClient, EmailMessage } from "@azure/communication-email";

type IEmail = {
    subject: string;
    plainText: string;
    html?: string;
}

export async function sendEmail(toAddress: string[], email: IEmail) {
    const { azureMail } = getBootSec();
    const client = new EmailClient(azureMail.connectionString);
    const emailMessage: EmailMessage = {
        senderAddress: azureMail.from,
        content: {
            ...email,
        },
        recipients: {
            to: toAddress.map(address=>({ address })),
        }
    };

    const poller = await client.beginSend(emailMessage);
    const result = await poller.pollUntilDone();
    console.log(result)
}