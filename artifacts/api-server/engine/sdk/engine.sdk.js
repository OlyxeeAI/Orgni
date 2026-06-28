/**
 * src/sdk/engine.sdk.js
 *
 * ORGNI ENGINE SDK
 *
 * This is the public interface for Orgni products.
 * Orgni Workflow, Orgni Finance, and any future product import from here.
 *
 * Products NEVER import from engine internals, models, or DB directly.
 * They only use what is exposed here.
 *
 * Usage:
 *   const OrgniEngine = require('../sdk/engine.sdk');
 *
 *   // Orgni Workflow
 *   const ctx = await OrgniEngine.forWorkflow(orgId);
 *   // ctx.workflows, ctx.roles, ctx.blueprint, ctx.bottlenecks
 *
 *   // Orgni Finance
 *   const ctx = await OrgniEngine.forFinance(orgId);
 *   // ctx.rules, ctx.approvals, ctx.exceptions, ctx.risks
 *
 *   // Ask a grounded question
 *   const answer = await OrgniEngine.ask(orgId, 'Who approves payments above R50,000?', docs);
 *
 *   // Get full context
 *   const ctx = await OrgniEngine.getContext(orgId);
 */

const engine = require('../engine/orgni.engine');
const knowledgeMap = require('../models/knowledgeMap.model');
const validationModel = require('../models/validation.model');
const insightModel = require('../models/insight.model');

const OrgniEngine = {

  /**
   * Run full intake for an organisation.
   * Call after initial setup or when requesting a full rebuild.
   */
  intake: (orgId, documents) => engine.runFullIntake(orgId, documents),

  /**
   * Incrementally update knowledge when a new document is added.
   * Merges new findings into the existing map — does not rebuild from scratch.
   */
  update: (orgId, newDocument, allDocuments) =>
    engine.runIncrementalUpdate(orgId, newDocument, allDocuments),

  /**
   * Get the full business context.
   * Returns everything Orgni knows about the organisation.
   */
  getContext: (orgId) => engine.getContext(orgId),

  /**
   * Context scoped to Orgni Workflow.
   * Returns: workflows, roles, dependencies, bottlenecks, blueprint.
   */
  forWorkflow: (orgId) => engine.getContextForDomain(orgId, 'workflow'),

  /**
   * Context scoped to Orgni Finance.
   * Returns: rules, approvals, exceptions, risks, gaps.
   */
  forFinance: (orgId) => engine.getContextForDomain(orgId, 'finance'),

  /**
   * Ask a grounded question about the organisation.
   * Answer is based only on stored knowledge — never guessed.
   */
  ask: (orgId, question, documents) => engine.ask(orgId, question, documents),

  /**
   * Have a conversation with Orgni about the organisation.
   * Accepts the full chat history so answers stay coherent across turns.
   * Answers are grounded in the knowledge map and source documents.
   */
  chat: (orgId, messages, documents) => engine.chat(orgId, messages, documents),

  /**
   * Get the knowledge map history for an org (all versions).
   */
  getHistory: (orgId) => knowledgeMap.getHistory(orgId),

  /**
   * Get validation stats — how confident is Orgni in what it knows?
   */
  getValidationStats: (orgId) => validationModel.getStats(orgId),

  /**
   * Get findings that need human review.
   */
  getNeedsReview: (orgId) => validationModel.findNeedsReview(orgId),

  /**
   * Get every validated finding for an org (all statuses) for the review queue.
   */
  getValidations: (orgId) => validationModel.findByOrg(orgId),

  /**
   * Human edits a finding's claim / excerpt.
   */
  editFinding: (validationId, patch, reviewedBy) =>
    validationModel.humanEdit(validationId, patch, reviewedBy),

  /**
   * Human confirms a finding is correct.
   */
  confirmFinding: (validationId, reviewedBy) =>
    validationModel.humanConfirm(validationId, reviewedBy),

  /**
   * Human rejects a finding.
   */
  rejectFinding: (validationId, reviewedBy, reason) =>
    validationModel.humanReject(validationId, reviewedBy, reason),

  /**
   * Get all insights for an org, optionally filtered by type.
   * Types: workflow | role | rule | risk | gap | opportunity
   */
  getInsights: (orgId, type) =>
    type ? insightModel.findByType(orgId, type) : insightModel.findByOrg(orgId),

  /**
   * Check if an org has a ready knowledge map.
   */
  isReady: async (orgId) => {
    const ctx = await engine.getContext(orgId);
    return !!ctx;
  }
};

module.exports = OrgniEngine;
