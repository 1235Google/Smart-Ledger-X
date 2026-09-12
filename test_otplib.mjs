import { generateSecret, generateURI, verifySync, TOTP } from 'otplib';
const secret = generateSecret();
const uri = generateURI({ secret, accountName: 'user@example.com', issuer: 'MyApp' });
console.log(secret, uri);
