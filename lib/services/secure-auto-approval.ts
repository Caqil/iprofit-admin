// lib/services/secure-auto-approval.ts
import mongoose from 'mongoose';
import { BusinessRules } from '@/lib/settings-helper';
import connectToDatabase from '../db';
import { Referral } from '@/models/Referral';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';

// Security risk levels
export enum SecurityRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security check result interface
interface SecurityCheckResult {
  passed: boolean;
  riskLevel: SecurityRiskLevel;
  reasons: string[];
  score: number; // 0-100, higher is riskier
  details: Record<string, any>;
}

// Enhanced auto-approval configuration
interface SecureAutoApprovalConfig {
  enableIpValidation: boolean;
  enableDeviceValidation: boolean;
  enableGeolocationCheck: boolean;
  enableBehavioralAnalysis: boolean;
  enableVpnDetection: boolean;
  maxRiskScore: number;
  minAccountAge: number; // days
  maxSameIpReferrals: number;
  maxDailyReferrals: number;
  requireEmailVerification: boolean;
  requirePhoneVerification: boolean;
  enableTimingAnalysis: boolean;
}

export class SecureAutoApprovalService {
  
  /**
   * Enhanced auto-approval with comprehensive security checks
   */
  static async processSecureAutoApproval(referralId: string, session?: mongoose.ClientSession): Promise<{
    approved: boolean;
    reason: string;
    riskLevel: SecurityRiskLevel;
    securityScore: number;
    transactionId?: string;
    requiresManualReview?: boolean;
  }> {
    await connectToDatabase();
    
    try {
      // Get referral with full user data
      const referral = await Referral.findById(referralId)
        .populate({
          path: 'referrerId',
          select: 'name email phone kycStatus createdAt lastLoginAt deviceId balance totalDeposits'
        })
        .populate({
          path: 'refereeId', 
          select: 'name email phone kycStatus createdAt lastLoginAt deviceId ipAddress userAgent'
        })
        .session(session || null);

      if (!referral || referral.status !== 'Pending') {
        return { 
          approved: false, 
          reason: 'Referral not found or already processed',
          riskLevel: SecurityRiskLevel.HIGH,
          securityScore: 100
        };
      }

      // Get auto-approval configuration
      const config = await this.getSecureAutoApprovalConfig();
      const totalBonus = (referral.bonusAmount || 0) + (referral.profitBonus || 0);

      // Step 1: Basic eligibility check
      const basicEligibility = await BusinessRules.isBonusEligibleForAutoApproval(
        totalBonus,
        referral.bonusType as 'signup' | 'profit_share'
      );

      if (!basicEligibility.eligible) {
        return {
          approved: false,
          reason: basicEligibility.reason || 'Not eligible for auto-approval',
          riskLevel: SecurityRiskLevel.LOW,
          securityScore: 0
        };
      }

      // Step 2: Comprehensive security analysis
      const securityCheck = await this.performSecurityAnalysis(referral, config);

      // Step 3: Risk-based decision
      if (securityCheck.riskLevel === SecurityRiskLevel.CRITICAL || 
          securityCheck.score > config.maxRiskScore) {
        
        // Flag for manual review
        await this.flagForManualReview(referral, securityCheck, session);
        
        return {
          approved: false,
          reason: `High security risk detected: ${securityCheck.reasons.join(', ')}`,
          riskLevel: securityCheck.riskLevel,
          securityScore: securityCheck.score,
          requiresManualReview: true
        };
      }

      // Step 4: Auto-approve if security checks pass
      if (securityCheck.passed && securityCheck.score <= config.maxRiskScore) {
        const approvalResult = await this.executeSecureApproval(referral, securityCheck, session);
        
        return {
          approved: true,
          reason: 'Auto-approved after security validation',
          riskLevel: securityCheck.riskLevel,
          securityScore: securityCheck.score,
          transactionId: approvalResult.transactionId
        };
      }

      // Step 5: Medium risk - queue for review
      await this.queueForReview(referral, securityCheck, session);
      
      return {
        approved: false,
        reason: 'Queued for manual review due to security concerns',
        riskLevel: securityCheck.riskLevel,
        securityScore: securityCheck.score,
        requiresManualReview: true
      };

    } catch (error) {
      console.error('Secure auto-approval error:', error);
      return {
        approved: false,
        reason: 'Security validation failed',
        riskLevel: SecurityRiskLevel.HIGH,
        securityScore: 95
      };
    }
  }

  /**
   * Comprehensive security analysis
   */
  private static async performSecurityAnalysis(
    referral: any, 
    config: SecureAutoApprovalConfig
  ): Promise<SecurityCheckResult> {
    
    const checks: Array<() => Promise<Partial<SecurityCheckResult>>> = [];
    
    // Add security checks based on configuration
    if (config.enableIpValidation) {
      checks.push(() => this.checkIpSecurity(referral));
    }
    
    if (config.enableDeviceValidation) {
      checks.push(() => this.checkDeviceSecurity(referral));
    }
    
    if (config.enableGeolocationCheck) {
      checks.push(() => this.checkGeolocationSecurity(referral));
    }
    
    if (config.enableBehavioralAnalysis) {
      checks.push(() => this.checkBehavioralPatterns(referral));
    }
    
    if (config.enableVpnDetection) {
      checks.push(() => this.checkVpnUsage(referral));
    }
    
    if (config.enableTimingAnalysis) {
      checks.push(() => this.checkTimingPatterns(referral));
    }

    // Always check account verification
    checks.push(() => this.checkAccountVerification(referral, config));
    checks.push(() => this.checkSuspiciousActivity(referral));

    // Execute all security checks
    const results = await Promise.all(checks.map(check => check()));
    
    // Aggregate results
    let totalScore = 0;
    let allReasons: string[] = [];
    let allPassed = true;
    let highestRisk = SecurityRiskLevel.LOW;
    let combinedDetails: Record<string, any> = {};

    results.forEach(result => {
      if (result.score) totalScore += result.score;
      if (result.reasons) allReasons.push(...result.reasons);
      if (!result.passed) allPassed = false;
      if (result.riskLevel && this.getRiskValue(result.riskLevel) > this.getRiskValue(highestRisk)) {
        highestRisk = result.riskLevel;
      }
      if (result.details) {
        Object.assign(combinedDetails, result.details);
      }
    });

    // Calculate final risk level
    const finalRiskLevel = this.calculateFinalRiskLevel(totalScore, highestRisk);

    return {
      passed: allPassed && totalScore <= 50, // Pass if score is reasonable
      riskLevel: finalRiskLevel,
      reasons: allReasons,
      score: Math.min(totalScore, 100),
      details: combinedDetails
    };
  }

  /**
   * IP Security Check
   */
  private static async checkIpSecurity(referral: any): Promise<Partial<SecurityCheckResult>> {
    const reasons: string[] = [];
    let score = 0;
    let riskLevel = SecurityRiskLevel.LOW;

    try {
      const referrer = referral.referrerId;
      const referee = referral.refereeId;

      // Get IP addresses from recent activity
      const [referrerIps, refereeIps] = await Promise.all([
        this.getRecentIpAddresses(referrer._id),
        this.getRecentIpAddresses(referee._id)
      ]);

      // Check for same IP usage
      const commonIps = referrerIps.filter(ip => refereeIps.includes(ip));
      if (commonIps.length > 0) {
        reasons.push('Same IP address detected between referrer and referee');
        score += 30;
        riskLevel = SecurityRiskLevel.HIGH;
      }

      // Check for too many referrals from same IP
      const sameIpReferrals = await this.countReferralsFromSameIp(referrerIps[0]);
      if (sameIpReferrals > 5) {
        reasons.push(`Too many referrals from same IP: ${sameIpReferrals}`);
        score += 25;
        riskLevel = SecurityRiskLevel.MEDIUM;
      }

      // Check for suspicious IP patterns
      const suspiciousIps = await this.checkSuspiciousIpPatterns(refereeIps);
      if (suspiciousIps.length > 0) {
        reasons.push('Suspicious IP patterns detected');
        score += 20;
        riskLevel = SecurityRiskLevel.MEDIUM;
      }

    } catch (error) {
      console.error('IP security check failed:', error);
      score += 10;
    }

    return {
      passed: score < 30,
      score,
      reasons,
      riskLevel,
      details: { ipSecurityScore: score }
    };
  }

  /**
   * Device Security Check (Simplified - without DeviceFingerprint model)
   */
  private static async checkDeviceSecurity(referral: any): Promise<Partial<SecurityCheckResult>> {
    const reasons: string[] = [];
    let score = 0;
    let riskLevel = SecurityRiskLevel.LOW;

    try {
      const referrer = referral.referrerId;
      const referee = referral.refereeId;

      // Check for device ID collision (basic check)
      if (referrer.deviceId && referee.deviceId && referrer.deviceId === referee.deviceId) {
        reasons.push('Same device ID detected');
        score += 35;
        riskLevel = SecurityRiskLevel.HIGH;
      }

      // Check for too many accounts per device (simplified)
      if (referee.deviceId) {
        const deviceAccountCount = await User.countDocuments({ deviceId: referee.deviceId });
        if (deviceAccountCount > 3) {
          reasons.push(`Too many accounts on same device: ${deviceAccountCount}`);
          score += 20;
          riskLevel = SecurityRiskLevel.MEDIUM;
        }
      }

    } catch (error) {
      console.error('Device security check failed:', error);
      score += 5;
    }

    return {
      passed: score < 25,
      score,
      reasons,
      riskLevel,
      details: { deviceSecurityScore: score }
    };
  }

  /**
   * Behavioral Pattern Analysis
   */
  private static async checkBehavioralPatterns(referral: any): Promise<Partial<SecurityCheckResult>> {
    const reasons: string[] = [];
    let score = 0;
    let riskLevel = SecurityRiskLevel.LOW;

    try {
      const referrer = referral.referrerId;
      const referee = referral.refereeId;

      // Check account creation timing
      const timeDiff = Math.abs(new Date(referee.createdAt).getTime() - new Date(referrer.createdAt).getTime());
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      if (daysDiff < 1) {
        reasons.push('Accounts created within 24 hours');
        score += 25;
        riskLevel = SecurityRiskLevel.MEDIUM;
      }

      // Check similar names/emails
      const nameSimilarity = this.calculateStringSimilarity(referrer.name, referee.name);
      if (nameSimilarity > 0.8) {
        reasons.push('High name similarity detected');
        score += 20;
        riskLevel = SecurityRiskLevel.MEDIUM;
      }

      // Check for sequential email patterns
      if (this.checkSequentialEmails(referrer.email, referee.email)) {
        reasons.push('Sequential email pattern detected');
        score += 30;
        riskLevel = SecurityRiskLevel.HIGH;
      }

      // Check activity patterns
      const [referrerActivity, refereeActivity] = await Promise.all([
        this.getUserActivityPattern(referrer._id),
        this.getUserActivityPattern(referee._id)
      ]);

      if (this.compareActivityPatterns(referrerActivity, refereeActivity) > 0.9) {
        reasons.push('Identical activity patterns');
        score += 25;
        riskLevel = SecurityRiskLevel.HIGH;
      }

    } catch (error) {
      console.error('Behavioral analysis failed:', error);
      score += 5;
    }

    return {
      passed: score < 20,
      score,
      reasons,
      riskLevel,
      details: { behavioralScore: score }
    };
  }

  /**
   * Account Verification Check
   */
  private static async checkAccountVerification(
    referral: any, 
    config: SecureAutoApprovalConfig
  ): Promise<Partial<SecurityCheckResult>> {
    const reasons: string[] = [];
    let score = 0;
    let riskLevel = SecurityRiskLevel.LOW;

    const referrer = referral.referrerId;
    const referee = referral.refereeId;

    // Check KYC status
    if (referee.kycStatus !== 'Approved') {
      if (config.requireEmailVerification) {
        reasons.push('Referee KYC not approved');
        score += 15;
        riskLevel = SecurityRiskLevel.MEDIUM;
      }
    }

    // Check account age
    const refereeAge = Math.floor(
      (Date.now() - new Date(referee.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (refereeAge < config.minAccountAge) {
      reasons.push(`Account too new: ${refereeAge} days`);
      score += 20;
      riskLevel = SecurityRiskLevel.MEDIUM;
    }

    // Check if referee has made deposits
    if (referee.totalDeposits === 0 && referral.bonusType === 'signup') {
      reasons.push('No deposits made by referee');
      score += 10;
    }

    // Check for email/phone verification if required
    if (config.requireEmailVerification && !referee.emailVerified) {
      reasons.push('Email not verified');
      score += 15;
    }

    if (config.requirePhoneVerification && !referee.phoneVerified) {
      reasons.push('Phone not verified');
      score += 15;
    }

    return {
      passed: score < 20,
      score,
      reasons,
      riskLevel,
      details: { verificationScore: score }
    };
  }

  /**
   * VPN Detection Check
   */
  private static async checkVpnUsage(referral: any): Promise<Partial<SecurityCheckResult>> {
    const reasons: string[] = [];
    let score = 0;
    let riskLevel = SecurityRiskLevel.LOW;

    try {
      const refereeIps = await this.getRecentIpAddresses(referral.refereeId._id);
      
      // Check each IP for VPN/proxy usage
      for (const ip of refereeIps.slice(0, 3)) { // Check last 3 IPs
        const vpnCheck = await this.checkIpForVpn(ip);
        if (vpnCheck.isVpn) {
          reasons.push(`VPN/Proxy detected: ${ip}`);
          score += 25;
          riskLevel = SecurityRiskLevel.HIGH;
        }
      }

    } catch (error) {
      console.error('VPN check failed:', error);
      score += 5;
    }

    return {
      passed: score < 20,
      score,
      reasons,
      riskLevel,
      details: { vpnScore: score }
    };
  }

  /**
   * Timing Pattern Analysis
   */
  private static async checkTimingPatterns(referral: any): Promise<Partial<SecurityCheckResult>> {
    const reasons: string[] = [];
    let score = 0;
    let riskLevel = SecurityRiskLevel.LOW;

    try {
      const referrer = referral.referrerId;
      const referee = referral.refereeId;

      // Check if referral happened too quickly after signup
      const timeSinceSignup = Date.now() - new Date(referee.createdAt).getTime();
      const minutesSinceSignup = timeSinceSignup / (1000 * 60);

      if (minutesSinceSignup < 10) {
        reasons.push('Referral triggered too quickly after signup');
        score += 30;
        riskLevel = SecurityRiskLevel.HIGH;
      }

      // Check for suspicious activity timing
      const lastLogin = new Date(referee.lastLoginAt || referee.createdAt);
      const loginGap = Date.now() - lastLogin.getTime();
      const hoursSinceLogin = loginGap / (1000 * 60 * 60);

      if (hoursSinceLogin > 168) { // 7 days
        reasons.push('Long gap since last activity');
        score += 15;
        riskLevel = SecurityRiskLevel.MEDIUM;
      }

    } catch (error) {
      console.error('Timing analysis failed:', error);
      score += 5;
    }

    return {
      passed: score < 25,
      score,
      reasons,
      riskLevel,
      details: { timingScore: score }
    };
  }

  /**
   * Execute secure approval
   */
  private static async executeSecureApproval(
    referral: any,
    securityCheck: SecurityCheckResult,
    session?: mongoose.ClientSession
  ): Promise<{ transactionId: string }> {
    
    const totalBonus = (referral.bonusAmount || 0) + (referral.profitBonus || 0);

    // Create secure transaction
    const transaction = new Transaction({
      userId: referral.referrerId,
      type: 'bonus',
      amount: totalBonus,
      currency: 'BDT',
      gateway: 'System',
      status: 'Approved',
      description: `Secure auto-approved referral bonus - ${referral.bonusType}`,
      netAmount: totalBonus,
      processedAt: new Date(),
      metadata: {
        referralId: referral._id,
        refereeId: referral.refereeId,
        bonusType: referral.bonusType,
        securityValidated: true,
        securityScore: securityCheck.score,
        riskLevel: securityCheck.riskLevel,
        autoApproved: true,
        securityChecks: securityCheck.details
      }
    });

    await transaction.save({ session: session || undefined });

    // Update user balance
    await User.findByIdAndUpdate(
      referral.referrerId,
      { $inc: { balance: totalBonus } },
      { session: session || undefined }
    );

    // Update referral with security info
    referral.status = 'Paid';
    referral.transactionId = transaction._id;
    referral.paidAt = new Date();
    referral.adminNotes = `Secure auto-approved (Risk: ${securityCheck.riskLevel}, Score: ${securityCheck.score})`;
    referral.metadata = {
      ...referral.metadata,
      securityValidation: {
        validated: true,
        score: securityCheck.score,
        riskLevel: securityCheck.riskLevel,
        validatedAt: new Date()
      }
    };
    
    await referral.save({ session: session || undefined });

    return { transactionId: transaction._id.toString() };
  }

  // Helper methods for security checks (simplified without DeviceFingerprint)
  private static async getRecentIpAddresses(userId: string): Promise<string[]> {
    // Simplified implementation - get IP from user records or audit logs
    try {
      const user = await User.findById(userId).select('lastIpAddress');
      return user?.lastIpAddress ? [user.lastIpAddress] : [];
    } catch {
      return [];
    }
  }

  private static async checkIpForVpn(ip: string): Promise<{ isVpn: boolean; provider?: string }> {
    // Implement VPN detection logic (could use external service)
    // For demo purposes, checking against known VPN ranges
    const vpnRanges = ['10.', '172.', '192.168.', '169.254.'];
    const isPrivate = vpnRanges.some(range => ip.startsWith(range));
    
    return { isVpn: isPrivate };
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - matrix[str2.length][str1.length] / maxLength;
  }

  private static getRiskValue(risk: SecurityRiskLevel): number {
    switch (risk) {
      case SecurityRiskLevel.LOW: return 1;
      case SecurityRiskLevel.MEDIUM: return 2;
      case SecurityRiskLevel.HIGH: return 3;
      case SecurityRiskLevel.CRITICAL: return 4;
      default: return 1;
    }
  }

  private static calculateFinalRiskLevel(score: number, highestRisk: SecurityRiskLevel): SecurityRiskLevel {
    if (score >= 80 || highestRisk === SecurityRiskLevel.CRITICAL) return SecurityRiskLevel.CRITICAL;
    if (score >= 60 || highestRisk === SecurityRiskLevel.HIGH) return SecurityRiskLevel.HIGH;
    if (score >= 30 || highestRisk === SecurityRiskLevel.MEDIUM) return SecurityRiskLevel.MEDIUM;
    return SecurityRiskLevel.LOW;
  }

  /**
   * Get security configuration
   */
  private static async getSecureAutoApprovalConfig(): Promise<SecureAutoApprovalConfig> {
    // This would typically come from your settings system
    return {
      enableIpValidation: true,
      enableDeviceValidation: true,
      enableGeolocationCheck: false, // Can be enabled if you have geolocation data
      enableBehavioralAnalysis: true,
      enableVpnDetection: true,
      enableTimingAnalysis: true,
      maxRiskScore: 50,
      minAccountAge: 1, // days
      maxSameIpReferrals: 5,
      maxDailyReferrals: 10,
      requireEmailVerification: false,
      requirePhoneVerification: false
    };
  }

  // Additional helper methods (simplified)
  private static async countReferralsFromSameIp(ip: string): Promise<number> { 
    try {
      return await User.countDocuments({ lastIpAddress: ip });
    } catch {
      return 0;
    }
  }
  private static async checkSuspiciousIpPatterns(ips: string[]): Promise<string[]> { return []; }
  private static checkSequentialEmails(email1: string, email2: string): boolean { 
    // Simple check for sequential patterns like user1@domain.com, user2@domain.com
    const pattern1 = email1.replace(/\d+/, 'X');
    const pattern2 = email2.replace(/\d+/, 'X');
    return pattern1 === pattern2;
  }
  private static async getUserActivityPattern(userId: string): Promise<any> { return {}; }
  private static compareActivityPatterns(pattern1: any, pattern2: any): number { return 0; }
  private static async flagForManualReview(referral: any, securityCheck: SecurityCheckResult, session?: mongoose.ClientSession): Promise<void> {
    // Flag referral for manual review
    referral.status = 'Flagged';
    referral.metadata = {
      ...referral.metadata,
      securityFlag: {
        flagged: true,
        riskLevel: securityCheck.riskLevel,
        score: securityCheck.score,
        reasons: securityCheck.reasons,
        flaggedAt: new Date()
      }
    };
    await referral.save({ session });
  }
  private static async queueForReview(referral: any, securityCheck: SecurityCheckResult, session?: mongoose.ClientSession): Promise<void> {
    // Queue for review - similar to flagging but with different status
    referral.metadata = {
      ...referral.metadata,
      queuedForReview: {
        queued: true,
        riskLevel: securityCheck.riskLevel,
        score: securityCheck.score,
        reasons: securityCheck.reasons,
        queuedAt: new Date()
      }
    };
    await referral.save({ session });
  }
  private static async checkSuspiciousActivity(referral: any): Promise<Partial<SecurityCheckResult>> {
    const reasons: string[] = [];
    let score = 0;
    
    // Check for rapid account creation
    const referrer = referral.referrerId;
    const referee = referral.refereeId;
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      referredBy: referrer._id
    });
    
    if (recentUsers > 5) {
      reasons.push('Too many recent referrals');
      score += 25;
    }
    
    return { 
      passed: score < 20, 
      score, 
      reasons, 
      riskLevel: score > 20 ? SecurityRiskLevel.MEDIUM : SecurityRiskLevel.LOW 
    };
  }
  private static async checkGeolocationSecurity(referral: any): Promise<Partial<SecurityCheckResult>> {
    return { passed: true, score: 0, reasons: [], riskLevel: SecurityRiskLevel.LOW };
  }
}