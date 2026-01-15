// Dummy knowledge articles data for development

export type KnowledgeFormat = 'json' | 'markdown' | 'text';

export interface KnowledgeArticle {
  id: string;
  title: string;
  description: string;
  format: KnowledgeFormat;
  content: string;
  assignedAgent: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
  };
  updatedBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}

export const DUMMY_KNOWLEDGE: KnowledgeArticle[] = [
  {
    id: 'kb-001',
    title: 'Company Refund Policy',
    description: 'Complete refund policy and procedures for customer support',
    format: 'markdown',
    assignedAgent: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    content: `# Refund Policy

## Overview
Our refund policy is designed to ensure customer satisfaction while maintaining fair business practices.

## Eligibility
- Products can be returned within **30 days** of purchase
- Items must be in original condition with tags attached
- Proof of purchase is required

## Process
1. Contact customer support
2. Obtain RMA number
3. Ship item back with RMA
4. Refund processed within 5-7 business days

## Exceptions
- Digital products are non-refundable
- Custom orders cannot be returned
- Sale items are final sale

## Contact
For questions, contact support@example.com`,
    createdBy: {
      id: 'user-001',
      name: 'Sarah Johnson',
    },
    updatedBy: {
      id: 'user-002',
      name: 'Mike Chen',
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    version: 3,
  },
  {
    id: 'kb-002',
    title: 'Product Specifications',
    description: 'Technical specifications and features for flagship products',
    format: 'json',
    assignedAgent: {
      id: 'agent-002',
      name: 'Sales Agent',
    },
    content: JSON.stringify({
      products: [
        {
          id: 'prod-001',
          name: 'Premium Widget',
          specifications: {
            dimensions: {
              width: '10cm',
              height: '15cm',
              depth: '5cm',
            },
            weight: '250g',
            material: 'Aluminum alloy',
            colors: ['Silver', 'Black', 'Blue'],
            warranty: '2 years',
          },
          features: [
            'Wireless connectivity',
            'Water resistant (IP67)',
            'USB-C charging',
            'Smart auto-sleep',
          ],
          pricing: {
            msrp: 149.99,
            currency: 'USD',
          },
        },
        {
          id: 'prod-002',
          name: 'Standard Widget',
          specifications: {
            dimensions: {
              width: '8cm',
              height: '12cm',
              depth: '4cm',
            },
            weight: '180g',
            material: 'Plastic',
            colors: ['White', 'Gray'],
            warranty: '1 year',
          },
          features: [
            'Bluetooth 5.0',
            'Micro-USB charging',
            '10-hour battery life',
          ],
          pricing: {
            msrp: 79.99,
            currency: 'USD',
          },
        },
      ],
    }, null, 2),
    createdBy: {
      id: 'user-003',
      name: 'Alex Rivera',
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    version: 5,
  },
  {
    id: 'kb-003',
    title: 'Shipping Information',
    description: 'Shipping methods, costs, and delivery timeframes',
    format: 'text',
    assignedAgent: {
      id: 'agent-003',
      name: 'Logistics Agent',
    },
    content: `SHIPPING INFORMATION

Standard Shipping
- Delivery: 5-7 business days
- Cost: $5.99 (Free over $50)
- Tracking included

Express Shipping
- Delivery: 2-3 business days
- Cost: $12.99
- Tracking included
- Available Mon-Fri

Overnight Shipping
- Delivery: Next business day
- Cost: $24.99
- Order by 2 PM EST
- Available Mon-Thu

International Shipping
- Delivery: 10-21 business days
- Costs vary by destination
- Customs fees may apply
- Tracking available

Order Processing
- Orders ship within 1-2 business days
- Processing may be delayed during holidays
- You will receive tracking info via email

Shipping Restrictions
- We ship to all US states and territories
- International shipping available to select countries
- Some items cannot be shipped internationally

For questions about shipping, contact shipping@example.com`,
    createdBy: {
      id: 'user-004',
      name: 'Emily Watson',
    },
    updatedBy: {
      id: 'user-001',
      name: 'Sarah Johnson',
    },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    version: 2,
  },
  {
    id: 'kb-004',
    title: 'Troubleshooting Guide',
    description: 'Common issues and solutions for customer support',
    format: 'markdown',
    assignedAgent: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    content: `# Troubleshooting Guide

## Device Won't Turn On

### Quick Fixes
1. **Check battery charge**
   - Connect to power for 15 minutes
   - Try a different charging cable
   - Test with a different power outlet

2. **Force restart**
   - Hold power button for 10 seconds
   - Release and wait 5 seconds
   - Press power button again

3. **Check for damage**
   - Inspect charging port
   - Look for physical damage
   - Check for water exposure

### If Still Not Working
Contact support with:
- Device serial number
- Purchase date
- Description of issue

---

## Connectivity Issues

### Wi-Fi Problems
- Restart router and device
- Forget network and reconnect
- Check for firmware updates
- Move closer to router

### Bluetooth Problems
- Toggle Bluetooth off/on
- Unpair and re-pair device
- Clear Bluetooth cache
- Check device compatibility

---

## Performance Issues

### Device Running Slow
1. Close unused apps
2. Clear cache and temporary files
3. Check available storage
4. Restart device
5. Update software

### Battery Draining Fast
- Reduce screen brightness
- Disable background apps
- Turn off location services
- Enable battery saver mode
- Check battery health

---

## Contact Support
If issues persist:
- Email: support@example.com
- Phone: 1-800-SUPPORT
- Live Chat: Available 24/7`,
    createdBy: {
      id: 'user-002',
      name: 'Mike Chen',
    },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    version: 7,
  },
  {
    id: 'kb-005',
    title: 'API Rate Limits',
    description: 'API usage limits and throttling policies',
    format: 'json',
    assignedAgent: {
      id: 'agent-004',
      name: 'Technical Client Support Agent',
    },
    content: JSON.stringify({
      rateLimits: {
        free: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          concurrent: 5,
        },
        pro: {
          requestsPerMinute: 600,
          requestsPerHour: 10000,
          requestsPerDay: 100000,
          concurrent: 50,
        },
        enterprise: {
          requestsPerMinute: 'unlimited',
          requestsPerHour: 'unlimited',
          requestsPerDay: 'unlimited',
          concurrent: 200,
        },
      },
      throttling: {
        strategy: 'token-bucket',
        burstAllowed: true,
        retryAfterHeader: true,
      },
      errorResponses: {
        429: {
          message: 'Rate limit exceeded',
          retryAfter: 'Seconds until limit resets',
          headers: {
            'X-RateLimit-Limit': 'Maximum requests allowed',
            'X-RateLimit-Remaining': 'Requests remaining',
            'X-RateLimit-Reset': 'Unix timestamp of limit reset',
          },
        },
      },
      bestPractices: [
        'Implement exponential backoff',
        'Cache responses when possible',
        'Use webhooks for real-time updates',
        'Batch requests when available',
      ],
    }, null, 2),
    createdBy: {
      id: 'user-005',
      name: 'David Park',
    },
    updatedBy: {
      id: 'user-003',
      name: 'Alex Rivera',
    },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    version: 4,
  },
  {
    id: 'kb-006',
    title: 'Onboarding Checklist',
    description: 'New customer onboarding steps and best practices',
    format: 'markdown',
    assignedAgent: {
      id: 'agent-002',
      name: 'Sales Agent',
    },
    content: `# New Customer Onboarding

## Welcome Message
Send personalized welcome email within 24 hours of signup.

## Setup Steps

### Week 1: Getting Started
- [ ] Send welcome email with login credentials
- [ ] Provide quick start guide
- [ ] Schedule onboarding call
- [ ] Share video tutorials
- [ ] Assign customer success manager

### Week 2: Configuration
- [ ] Complete profile setup
- [ ] Configure integrations
- [ ] Import existing data
- [ ] Set up team members
- [ ] Review security settings

### Week 3: Training
- [ ] Basic features walkthrough
- [ ] Advanced features demo
- [ ] Q&A session
- [ ] Share knowledge base
- [ ] Provide certification path

### Week 4: Optimization
- [ ] Review usage patterns
- [ ] Optimize workflows
- [ ] Address any issues
- [ ] Gather feedback
- [ ] Plan for scaling

## Success Metrics
Track these KPIs:
- Time to first value: < 7 days
- Feature adoption: > 60% in first month
- Support tickets: < 3 per customer
- Customer satisfaction: > 4.5/5

## Resources
- [Getting Started Guide](https://docs.example.com/start)
- [Video Library](https://videos.example.com)
- [Community Forum](https://community.example.com)
- [Support Portal](https://support.example.com)`,
    createdBy: {
      id: 'user-001',
      name: 'Sarah Johnson',
    },
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    version: 2,
  },
  {
    id: 'kb-007',
    title: 'Security Best Practices',
    description: 'Security guidelines and recommendations for users',
    format: 'text',
    assignedAgent: {
      id: 'agent-004',
      name: 'Technical Client Support Agent',
    },
    content: `SECURITY BEST PRACTICES

Password Requirements
- Minimum 12 characters
- Mix of upper and lowercase letters
- Include numbers and special characters
- Avoid common words or patterns
- Don't reuse passwords across services

Two-Factor Authentication (2FA)
- Enable 2FA on all accounts
- Use authenticator app (recommended)
- Keep backup codes in secure location
- Don't share 2FA codes

Account Security
- Review account activity regularly
- Update security questions
- Use unique email for account
- Enable login notifications
- Set up account recovery options

Data Protection
- Encrypt sensitive data
- Use secure connections (HTTPS/SSL)
- Regularly backup important data
- Implement access controls
- Monitor for unusual activity

Device Security
- Keep software up to date
- Use antivirus/antimalware
- Enable device encryption
- Lock devices when not in use
- Use VPN on public networks

Employee Training
- Regular security awareness training
- Phishing simulation exercises
- Clear security policies
- Incident reporting procedures
- Regular security audits

Incident Response
If you suspect a security breach:
1. Change your password immediately
2. Enable 2FA if not already active
3. Review recent account activity
4. Contact security@example.com
5. Follow incident response plan

Compliance
- GDPR compliant
- SOC 2 Type II certified
- PCI DSS compliant
- HIPAA available for enterprise
- Regular third-party audits`,
    createdBy: {
      id: 'user-006',
      name: 'Robert Kim',
    },
    updatedBy: {
      id: 'user-006',
      name: 'Robert Kim',
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    version: 1,
  },
];

export function getKnowledgeById(id: string): KnowledgeArticle | undefined {
  return DUMMY_KNOWLEDGE.find((kb) => kb.id === id);
}
