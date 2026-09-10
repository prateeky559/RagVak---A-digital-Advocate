export type LegalSafetyCategory =
  | 'SAFE_INFORMATION'
  | 'HIGH_RISK_LEGAL'
  | 'PERSONALIZED_LEGAL_ADVICE'
  | 'EMERGENCY'
  | 'ILLEGAL_REQUEST'
  | 'OUT_OF_SCOPE';

export interface SafetyClassificationResult {
  category: LegalSafetyCategory;
  isBlocked: boolean;
  reason?: string;
  advisory?: string;
}

export class LegalSafetyService {
  public static readonly LEGAL_DISCLAIMER =
    'This application provides general legal information based on the documents available in its knowledge base. It is not a substitute for advice from a licensed legal professional, does not create an attorney-client relationship, and cannot guarantee legal outcomes.';

  /**
   * Classifies a user query into legal safety tiers
   */
  public static classifyQuery(question: string): SafetyClassificationResult {
    const q = question.toLowerCase();

    // 1. Emergency situation detection (violence, self-harm, imminent danger)
    if (
      /call 911|emergency|commit suicide|self-harm|hostage|active shooter|kill myself|immediate danger|in danger|threatening (my|a) life|threat to life|home invasion/i.test(q)
    ) {
      return {
        category: 'EMERGENCY',
        isBlocked: true,
        reason: 'This query indicates an emergency or crisis situation.',
        advisory:
          'If you or someone else is in immediate danger or experiencing an emergency, please contact local emergency services (such as 911 or local emergency numbers) or a crisis hotline immediately.',
      };
    }

    // 2. Illegal requests / assistance with committing crimes
    if (
      /how (do|can) i (commit|evade|get away with|hack|launder money|forge|bribe|destroy evidence|hide assets from court|flee jurisdiction)/i.test(q) ||
      /help me (hide assets|launder|tax fraud|forge documents)/i.test(q)
    ) {
      return {
        category: 'ILLEGAL_REQUEST',
        isBlocked: true,
        reason: 'Queries soliciting assistance in committing unlawful acts or obstructing justice cannot be processed.',
        advisory:
          'The system cannot assist in the commission, concealment, or evasion of illegal conduct or statutory violations.',
      };
    }

    // 3. Personalized legal advice ("Should I sue my landlord tomorrow?", "Will I win my lawsuit?")
    if (
      /should i (sue|plead guilty|sign this agreement|divorce|fire|settle for)/i.test(q) ||
      /will i win (my|the) (case|lawsuit|trial)/i.test(q) ||
      /how much (money )?will i get in damages/i.test(q) ||
      /can you represent me/i.test(q)
    ) {
      return {
        category: 'PERSONALIZED_LEGAL_ADVICE',
        isBlocked: false,
        advisory:
          'Notice: You are asking for advice on a specific personal legal strategy or prospective litigation outcome. This system can provide general statutory provisions and legal principles, but only a licensed attorney licensed in your jurisdiction can evaluate your specific case facts, calculate damages, or advise whether you should sue or sign.',
      };
    }

    // 4. High risk legal questions (criminal penalties, custodial sanctions, immigration deportation)
    if (
      /will i go to jail|prison sentence|deportation|mandatory minimum sentence|felony conviction|extradition/i.test(q)
    ) {
      return {
        category: 'HIGH_RISK_LEGAL',
        isBlocked: false,
        advisory:
          'Caution: This question involves significant personal legal liability or penal consequences. Please consult a qualified criminal defense attorney or legal aid specialist immediately.',
      };
    }

    // 5. Out of scope questions (cooking recipes, coding tutorials, casual chatter)
    if (
      /recipe for|weather in|who is the president of|write python code for snake|solve 2\+2/i.test(q)
    ) {
      return {
        category: 'OUT_OF_SCOPE',
        isBlocked: false,
        advisory:
          'Note: This question appears outside the scope of the legal document repository. The system will search available legal sources but may not find relevant statutory information.',
      };
    }

    // Default: Safe informational question
    return {
      category: 'SAFE_INFORMATION',
      isBlocked: false,
    };
  }
}
