import { detectDeviceTypeSync } from './detectDevice';

export function runDetectDeviceTests() {
  const testCases = [
    {
      name: 'Windows Desktop UA',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      expected: 'Desktop'
    },
    {
      name: 'macOS Desktop UA',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
      expected: 'Desktop'
    },
    {
      name: 'ChromeOS UA',
      ua: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      expected: 'Desktop'
    },
    {
      name: 'Android Mobile UA',
      ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      expected: 'Mobile'
    },
    {
      name: 'iPad UA',
      ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      expected: 'Tablet'
    },
    {
      name: 'Unmatched UA',
      ua: 'CustomBot/1.0 (HeadlessBrowser)',
      expected: 'Unknown'
    }
  ];

  let passed = 0;
  for (const tc of testCases) {
    const result = detectDeviceTypeSync(tc.ua);
    if (result === tc.expected) {
      passed++;
      console.log(`[PASS] detectDevice test: ${tc.name} -> ${result}`);
    } else {
      console.error(`[FAIL] detectDevice test: ${tc.name} expected ${tc.expected}, got ${result}`);
    }
  }
  console.log(`[DetectDevice Tests] ${passed}/${testCases.length} passed.`);
}
