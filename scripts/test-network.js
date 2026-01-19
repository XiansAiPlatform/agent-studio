#!/usr/bin/env node

/**
 * Network Connectivity Test for NextAuth Google OAuth
 * 
 * This script tests if your system can reach Google's OAuth endpoints
 * Run with: node scripts/test-network.js
 */

console.log('🔍 Testing network connectivity for Google OAuth...\n')

const tests = [
  {
    name: 'Google OAuth Discovery',
    url: 'https://accounts.google.com/.well-known/openid-configuration',
  },
  {
    name: 'Google Accounts',
    url: 'https://accounts.google.com',
  },
  {
    name: 'Google OAuth2',
    url: 'https://oauth2.googleapis.com',
  },
]

async function testEndpoint(name, url) {
  try {
    console.log(`Testing: ${name}`)
    console.log(`URL: ${url}`)
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const start = Date.now()
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NextAuth-Network-Test/1.0',
      },
    })
    const duration = Date.now() - start
    
    clearTimeout(timeout)
    
    console.log(`✅ SUCCESS - Status: ${response.status} - Time: ${duration}ms\n`)
    return true
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ TIMEOUT - Request took longer than 5 seconds`)
    } else if (error.code === 'ENOTFOUND') {
      console.log(`❌ DNS ERROR - Cannot resolve domain`)
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`❌ CONNECTION REFUSED - Cannot connect to server`)
    } else {
      console.log(`❌ ERROR - ${error.message}`)
    }
    console.log('')
    return false
  }
}

async function checkProxy() {
  console.log('Proxy Configuration:')
  console.log(`HTTP_PROXY: ${process.env.HTTP_PROXY || 'not set'}`)
  console.log(`HTTPS_PROXY: ${process.env.HTTPS_PROXY || 'not set'}`)
  console.log(`NO_PROXY: ${process.env.NO_PROXY || 'not set'}`)
  console.log('')
}

async function runTests() {
  await checkProxy()
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    const success = await testEndpoint(test.name, test.url)
    if (success) {
      passed++
    } else {
      failed++
    }
  }
  
  console.log('═'.repeat(60))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('═'.repeat(60))
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Possible issues:')
    console.log('   1. You may be behind a proxy or firewall')
    console.log('   2. Your VPN might be blocking the connection')
    console.log('   3. Your ISP or network admin may be blocking Google')
    console.log('\n💡 Solutions:')
    console.log('   - Try disconnecting from VPN')
    console.log('   - Configure proxy settings if behind corporate firewall')
    console.log('   - Try using a mobile hotspot')
    console.log('   - Check docs/auth/TROUBLESHOOTING.md for more help')
    console.log('')
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed! Your network can reach Google OAuth.')
    console.log('   If you still have issues, check:')
    console.log('   - Your .env.local file has correct GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET')
    console.log('   - Your Google Cloud Console OAuth settings')
    console.log('')
    process.exit(0)
  }
}

runTests()
