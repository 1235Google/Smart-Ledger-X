import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

old_score = """  const scoreParams = {
    hasPin: securitySettings.pinEnabled || false,
    hasBiometrics: securitySettings.biometricEnabled || false,
    activeDevicesCount: devices.filter(d => d.status === 'active').length,
    lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isEmailVerified: true,
    hasPasskey: securitySettings.hasPasskey || false
  };
  
  const scoreResult = calculateSecurityScore(scoreParams);"""

new_score = """
  // Local more robust score calculation aligned with actual security posture
  const calculateRealScore = () => {
    let score = 30; // base score
    const recommendations = [];
    if (securitySettings.hasPasskey) score += 40;
    else recommendations.push("Add a Passkey for phishing-resistant passwordless login.");
    
    if (securitySettings.pinEnabled) score += 10;
    
    if (devices.length > 3) {
      score -= 10;
      recommendations.push("You have many active devices. Consider reviewing and signing out old ones.");
    } else {
      score += 10;
    }
    
    if (window.location.protocol === 'https:') score += 10;
    
    score = Math.max(0, Math.min(100, score));
    const level = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Attention';
    const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#ef4444';
    return { score, level, color, recommendations };
  };
  const scoreResult = calculateRealScore();
"""

code = code.replace(old_score, new_score)

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
