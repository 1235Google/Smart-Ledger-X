import { generateURI } from 'otplib';
console.log(generateURI({ secret: 'abc', label: 'user', issuer: 'MyApp' }));
