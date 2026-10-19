import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server";
const webauthnChallenges = {};
function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [key, entry] of Object.entries(webauthnChallenges)) {
    if (now - entry.timestamp > 3e5) {
      delete webauthnChallenges[key];
    }
  }
}
function getRelyingPartyConfig(req) {
  const clientRpId = typeof req.body?.rpId === "string" && req.body.rpId.trim() || typeof req.query?.rpId === "string" && req.query.rpId.trim() || "";
  const clientOrigin = typeof req.body?.origin === "string" && req.body.origin.trim() || typeof req.query?.origin === "string" && req.query.origin.trim() || "";
  const headers = req.headers || {};
  const rawHost = headers["x-forwarded-host"] || headers.host || req.hostname || "localhost";
  const host = rawHost.split(":")[0].trim();
  const proto = headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  const originHeader = headers.origin || (headers.referer ? new URL(headers.referer).origin : "");
  const defaultOrigin = originHeader || `${proto}://${rawHost}`;
  const expectedRPID = (clientRpId || host).split(":")[0].trim();
  const allowedOrigins = Array.from(new Set([
    clientOrigin,
    defaultOrigin,
    originHeader,
    `${proto}://${rawHost}`,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000"
  ].filter(Boolean)));
  return { expectedRPID, expectedOrigin: allowedOrigins };
}
function setCorsHeaders(res, req) {
  const origin = req?.headers?.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin, Access-Control-Request-Headers");
}
async function generateRegistrationOptionsCore(params) {
  cleanExpiredChallenges();
  const { expectedRPID } = getRelyingPartyConfig(params.req);
  const cleanUserId = (params.userId || "authenticated_user").trim();
  const cleanUserName = (params.userName || "user@smartledgerx.io").trim();
  const cleanDisplayName = (params.userDisplayName || cleanUserName || cleanUserId || "SmartLedger User").trim();
  const options = await generateRegistrationOptions({
    rpName: "SmartLedgerX",
    rpID: expectedRPID,
    userID: new Uint8Array(Buffer.from(cleanUserId)),
    userName: cleanUserName,
    userDisplayName: cleanDisplayName,
    timeout: 6e4,
    attestationType: "none",
    excludeCredentials: [],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required"
    }
  });
  webauthnChallenges[cleanUserId] = {
    challenge: options.challenge,
    timestamp: Date.now()
  };
  return options;
}
async function verifyRegistrationResponseCore(params) {
  cleanExpiredChallenges();
  const key = (params.userId || "authenticated_user").trim();
  const challengeEntry = webauthnChallenges[key];
  if (!challengeEntry) {
    return { verified: false, error: "Challenge not found or expired. Please try again." };
  }
  if (Date.now() - challengeEntry.timestamp > 3e5) {
    delete webauthnChallenges[key];
    return { verified: false, error: "Challenge expired. Please try again." };
  }
  const { expectedRPID, expectedOrigin } = getRelyingPartyConfig(params.req);
  const verification = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: challengeEntry.challenge,
    expectedOrigin,
    expectedRPID,
    requireUserVerification: false
  });
  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo;
    delete webauthnChallenges[key];
    return {
      verified: true,
      credential: {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter || 0,
        transports: credential.transports || ["internal"]
      }
    };
  }
  return { verified: false, error: "Authenticator verification failed." };
}
async function generateAuthenticationOptionsCore(params) {
  cleanExpiredChallenges();
  const { expectedRPID } = getRelyingPartyConfig(params.req);
  const cleanUserId = (params.userId || "authenticated_user").trim();
  const options = await generateAuthenticationOptions({
    rpID: expectedRPID,
    timeout: 6e4,
    allowCredentials: Array.isArray(params.allowCredentials) && params.allowCredentials.length > 0 ? params.allowCredentials.map((cred) => ({
      id: cred.id,
      transports: cred.transports || ["internal"]
    })) : void 0,
    userVerification: "required"
  });
  webauthnChallenges[cleanUserId] = {
    challenge: options.challenge,
    timestamp: Date.now()
  };
  return options;
}
async function verifyAuthenticationResponseCore(params) {
  cleanExpiredChallenges();
  const key = (params.userId || "authenticated_user").trim();
  const challengeEntry = webauthnChallenges[key];
  if (!challengeEntry) {
    return { verified: false, error: "Challenge not found or expired. Please try again." };
  }
  if (Date.now() - challengeEntry.timestamp > 3e5) {
    delete webauthnChallenges[key];
    return { verified: false, error: "Challenge expired. Please try again." };
  }
  const { expectedRPID, expectedOrigin } = getRelyingPartyConfig(params.req);
  const verification = await verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge: challengeEntry.challenge,
    expectedOrigin,
    expectedRPID,
    credential: {
      id: params.authenticator.id,
      publicKey: Uint8Array.from(Buffer.from(params.authenticator.publicKey, "base64url")),
      counter: params.authenticator.counter || 0
    },
    requireUserVerification: true
  });
  if (verification.verified) {
    delete webauthnChallenges[key];
    return { verified: true };
  }
  return { verified: false, error: "Authentication assertion verification failed." };
}
export {
  cleanExpiredChallenges,
  generateAuthenticationOptionsCore,
  generateRegistrationOptionsCore,
  getRelyingPartyConfig,
  setCorsHeaders,
  verifyAuthenticationResponseCore,
  verifyRegistrationResponseCore,
  webauthnChallenges
};
