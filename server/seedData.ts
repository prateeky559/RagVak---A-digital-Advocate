import { db, LegalDocument } from './db.js';
import { SecurityService } from './security.js';
import { DocumentChunker } from './chunker.js';
import { embeddingService } from './embeddings.js';

export async function seedInitialData(): Promise<void> {
  // 1. Seed Users (Admin & Demo User)
  const existingUsers = db.getUsers();
  if (existingUsers.length === 0) {
    const adminPassHash = await SecurityService.hashPassword('AdminPass123!');
    const userPassHash = await SecurityService.hashPassword('UserPass123!');

    db.addUser({
      id: 'usr_admin_01',
      email: 'admin@legalrag.internal',
      password_hash: adminPassHash,
      full_name: 'Lead Compliance Officer',
      role: 'ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.addUser({
      id: 'usr_demo_01',
      email: 'counsel@legalrag.internal',
      password_hash: userPassHash,
      full_name: 'Associate Legal Counsel',
      role: 'USER',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log('Seeded initial users: admin@legalrag.internal and counsel@legalrag.internal');
  }

  // 2. Seed Legal Documents & Embeddings
  const existingDocs = db.getDocuments();
  const existingDocIds = new Set(existingDocs.map(d => d.id));

  const sampleDocuments: { doc: LegalDocument; rawText: string }[] = [
    {
      doc: {
        id: 'doc_ipc_bns_crimes_01',
        title: 'Indian Penal Code (IPC) & Bharatiya Nyaya Sanhita (BNS) - Attempt to Murder and Criminal Offenses',
        source: 'Ministry of Law and Justice, Government of India',
        jurisdiction: 'India',
        document_type: 'STATUTE',
        version: 'IPC 1860 & BNS 2023 (IPC §§ 300, 302, 307, 323, 326, 420 / BNS §§ 101, 103, 109, 115, 118, 318)',
        effective_date: '2024-07-01',
        status: 'ACTIVE',
        checksum: 'sha256_ipc_bns_crimes_307_109',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      rawText: `Indian Penal Code, 1860 (IPC) and Bharatiya Nyaya Sanhita, 2023 (BNS)
CHAPTER ON OFFENSES AFFECTING THE HUMAN BODY AND PROPERTY

1. ATTEMPT TO MURDER (धारा 307 IPC / धारा 109 BNS)
Section 307 IPC / Section 109 BNS — Attempt to murder:
Whoever does any act with such intention or knowledge, and under such circumstances that, if he by that act caused death, he would be guilty of murder, shall be punished with imprisonment of either description for a term which may extend to 10 years, and shall also be liable to fine.
Causing Hurt During Attempt: If hurt is caused to any person by such act, the offender shall be liable either to imprisonment for life, or to such punishment as is hereinbefore mentioned (imprisonment up to 10 years and fine).
Attempts by Life-Convicts: When any person offending under this section is under sentence of imprisonment for life, he may, if hurt is caused, be punished with death or imprisonment for life.

LEGAL NATURE AND PROCEDURAL CLASSIFICATION OF ATTEMPT TO MURDER:
- Cognizable Offense: Police officer can arrest the accused without a warrant and can initiate investigation immediately upon registration of FIR under Section 154 CrPC / Section 173 BNSS.
- Non-Bailable Offense: Bail is not a matter of right. Police cannot grant bail at the police station. Bail can only be granted by a competent judicial magistrate or court of session based on the gravity of allegations, medical injury reports, and circumstances.
- Non-Compoundable Offense: The offense cannot be compromised or settled out of court between private parties without express quashing orders by the High Court under Section 482 CrPC / Section 528 BNSS.
- Triable Exclusively by Court of Session (सत्र न्यायालय): The trial must be conducted by the Sessions Court.

ESSENTIAL INGREDIENTS OF SECTION 307 IPC / SECTION 109 BNS:
1. Mens Rea (Intention or Knowledge): The accused must have possessed the intention to cause death, or the knowledge that their act was so imminently dangerous that in all probability it would cause death.
2. Actus Reus (Execution of Overt Act): An overt act was executed towards the commission of murder. Mere preparation is not enough; the act must have moved from preparation into execution.
3. Natural Consequences: If the act had succeeded without external intervention or medical treatment, it would have resulted in the death of the victim.
4. Non-Requirement of Grave Bodily Injury: As held by the Supreme Court of India in State of Maharashtra v. Balram Bama Patil (1983) and Hari Singh v. Sukhbir Singh (1988), it is NOT mandatory that the bodily injury inflicted must be grievous or fatal in itself; what is paramount is the intention or knowledge of the accused coupled with an overt act capable of causing death.

2. PUNISHMENT FOR MURDER (धारा 302 IPC / धारा 103 BNS)
Section 302 IPC / Section 103 BNS: Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.
Nature: Cognizable, Non-Bailable, Non-Compoundable, Triable by Court of Session.

3. CULPABLE HOMICIDE NOT AMOUNTING TO MURDER (धारा 304 IPC / धारा 105 BNS)
Section 304 IPC / Section 105 BNS: Punishment for culpable homicide not amounting to murder: Imprisonment for life, or imprisonment of either description for a term which may extend to 10 years, and fine.

4. VOLUNTARILY CAUSING HURT AND GRIEVOUS HURT (धारा 319-326 IPC / धारा 114-118 BNS)
- Hurt (Section 319/323 IPC / Section 114/115 BNS): Whoever causes bodily pain, disease or infirmity. Punishable with up to 1 year imprisonment or fine up to Rs 1,000.
- Grievous Hurt (Section 320/325 IPC / Section 116/117 BNS): Includes emasculation, permanent privation of sight or hearing, fracture of bone or tooth, or hurt which endangers life for 20 days. Punishable with up to 7 years imprisonment and fine.
- Grievous Hurt by Dangerous Weapons (Section 326 IPC / Section 118(2) BNS): Punishable with imprisonment for life or up to 10 years and fine. Non-bailable, triable by Magistrate First Class.

5. CHEATING AND FRAUD (धारा 420 IPC / धारा 318 BNS)
Section 420 IPC / Section 318(4) BNS: Cheating and dishonestly inducing delivery of property. Punishable with imprisonment up to 7 years and fine. Cognizable, Non-Bailable, Compoundable with permission of Court.

6. THEFT AND CRIMINAL BREACH OF TRUST (धारा 378/379 IPC / धारा 303 BNS & धारा 405/406 IPC / धारा 316 BNS)
- Theft: Taking movable property out of possession without consent. Punishable with up to 3 years imprisonment or fine.
- Criminal Breach of Trust: Dishonest misappropriation of entrusted property. Punishable with up to 3 years imprisonment or fine.`,
    },
    {
      doc: {
        id: 'doc_crpc_bnss_bail_fir_01',
        title: 'Code of Criminal Procedure (CrPC) & Bharatiya Nagarik Suraksha Sanhita (BNSS) - Bail, FIR, and Arrest Procedures',
        source: 'Ministry of Law and Justice, Government of India',
        jurisdiction: 'India',
        document_type: 'STATUTE',
        version: 'CrPC 1973 & BNSS 2023 (CrPC §§ 41, 41A, 154, 436, 437, 438, 439 / BNSS §§ 35, 173, 478, 480, 482, 483)',
        effective_date: '2024-07-01',
        status: 'ACTIVE',
        checksum: 'sha256_crpc_bnss_bail_fir_438_439',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      rawText: `Code of Criminal Procedure, 1973 (CrPC) and Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)
PROVISIONS GOVERNING FIR, ARREST SAFEGUARDS, AND BAIL

1. FIRST INFORMATION REPORT (FIR) (धारा 154 CrPC / धारा 173 BNSS)
Section 154 CrPC / Section 173 BNSS — Information in cognizable cases:
(1) Every information relating to the commission of a cognizable offense, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant.
(2) A copy of the information recorded shall be given forthwith, free of cost, to the informant.
(3) Mandatory Registration (Lalita Kumari v. Govt. of U.P. 2014): Registration of FIR is mandatory under Section 154 CrPC if the information discloses commission of a cognizable offense, and no preliminary inquiry is permissible in such situations.
(4) Concept of Zero FIR: An FIR can be lodged at any police station regardless of place of occurrence. The police must register the FIR (marked Zero), initiate primary protective steps, and subsequently transfer the dossier to the jurisdictional police station.

2. ARREST SAFEGUARDS AND NOTICE (धारा 41 & 41A CrPC / धारा 35 BNSS)
Section 41A CrPC / Section 35 BNSS: In all cases where arrest of a person is not required under the provisions of Section 41(1) (especially offenses punishable with imprisonment up to 7 years), the police officer shall issue a notice directing the person against whom a reasonable complaint has been made to appear before him.
Arnesh Kumar v. State of Bihar (2014): The Supreme Court mandated that arrest should not be made automatically or mechanically. Police officers must record reasons in writing for why arrest is necessary.

3. BAIL IN BAILABLE OFFENSES (धारा 436 CrPC / धारा 478 BNSS)
Section 436 CrPC / Section 478 BNSS: In bailable offenses, bail is an absolute statutory right, not a court discretion. The police officer or magistrate is legally obligated to release the accused upon execution of a personal bond with or without sureties.

4. REGULAR BAIL IN NON-BAILABLE OFFENSES (धारा 437 & 439 CrPC / धारा 480 & 483 BNSS)
Section 437 CrPC / Section 480 BNSS: When any person accused of or suspected of the commission of any non-bailable offense is arrested or detained without warrant, he may be released on bail by the Magistrate, subject to statutory limitations (such as when there appear reasonable grounds for believing that he has been guilty of an offense punishable with death or imprisonment for life).
Section 439 CrPC / Section 483 BNSS — Special Powers of High Court and Court of Session regarding bail:
The High Court or Court of Session may direct that any person accused of an offense and in custody be released on bail. The court evaluates: nature and gravity of accusation, severity of punishment, danger of accused absconding, character, behavior, means and standing of the accused, likelihood of tampering with witness testimony.

5. ANTICIPATORY BAIL (अग्रिम जमानत) (धारा 438 CrPC / धारा 482 BNSS)
Section 438 CrPC / Section 482 BNSS — Direction for grant of bail to person apprehending arrest:
Where any person has reason to believe that he may be arrested on an accusation of having committed a non-bailable offense, he may apply to the High Court or the Court of Session for a direction that in the event of such arrest, he shall be released on bail.
Sushila Aggarwal v. State (NCT of Delhi) (2020 - Constitution Bench): Anticipatory bail should not be routinely restricted to a specific period or until filing of charge sheet. Protection granted under Section 438 CrPC can continue until the conclusion of the trial.`,
    },
    {
      doc: {
        id: 'doc_const_india_01',
        title: 'Constitution of India - Fundamental Rights, Personal Liberty & Judicial Remedies',
        source: 'Legislative Department, Ministry of Law and Justice, India',
        jurisdiction: 'India',
        document_type: 'STATUTE',
        version: 'Constitution of India Part III (Articles 14, 19, 21, 22, 32, 226)',
        effective_date: '1950-01-26',
        status: 'ACTIVE',
        checksum: 'sha256_const_india_art_21_32',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      rawText: `Constitution of India — Part III Fundamental Rights
CORE CONSTITUTIONAL PROTECTIONS AND REMEDIES

Article 14 — Equality before law:
The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. Arbitrary state action violates Article 14 (E.P. Royappa principle).

Article 19 — Protection of certain rights regarding freedom of speech, assembly, and movement:
All citizens shall have the right to freedom of speech and expression, peaceful assembly without arms, formation of associations, free movement throughout India, residence, and practicing any profession, subject to reasonable restrictions.

Article 20 — Protection in respect of conviction for offenses:
(1) Protection against ex-post facto criminal laws.
(2) Protection against Double Jeopardy: No person shall be prosecuted and punished for the same offense more than once.
(3) Privilege against Self-Incrimination: No person accused of any offense shall be compelled to be a witness against himself.

Article 21 — Protection of life and personal liberty:
"No person shall be deprived of his life or personal liberty except according to procedure established by law."
Maneka Gandhi v. Union of India (1978): The procedure established by law must be just, fair, and reasonable, not fanciful, oppressive, or arbitrary.
Expansions of Article 21:
- Right to speedy trial (Hussainara Khatoon v. Home Secretary, State of Bihar).
- Right to free legal aid for underprivileged undertrials (Hussainara Khatoon & Khatri v. State of Bihar).
- Fundamental right to privacy as an intrinsic part of life and liberty (K.S. Puttaswamy v. Union of India 2017).
- Principle that "Bail is the rule, Jail is the exception" (State of Rajasthan v. Balchand 1977).

Article 22 — Protection against arrest and detention:
Every person arrested must be informed of the grounds of arrest as soon as may be, has the fundamental right to consult and be defended by a legal practitioner of choice, and must be produced before the nearest magistrate within twenty-four hours of arrest, excluding journey time.

Articles 32 and 226 — Right to Constitutional Remedies:
Supreme Court (Article 32) and High Courts (Article 226) have constitutional power to issue prerogative writs:
1. Habeas Corpus: To produce an unlawfully detained individual before the court and set them free.
2. Mandamus: To command a public authority to perform a mandatory statutory duty.
3. Certiorari: To quash an illegal order or judicial determination passed without jurisdiction.
4. Prohibition: To prevent an inferior tribunal from exceeding its lawful jurisdiction.
5. Quo Warranto: To challenge the right of a person to hold a public substantive office.`,
    },
    {
      doc: {
        id: 'doc_ni_act_138_01',
        title: 'Negotiable Instruments Act, 1881 - Dishonour of Cheque (Section 138)',
        source: 'Ministry of Finance, Government of India',
        jurisdiction: 'India',
        document_type: 'STATUTE',
        version: 'NI Act 1881 §§ 138, 139, 141, 142',
        effective_date: '1882-03-01',
        status: 'ACTIVE',
        checksum: 'sha256_ni_act_sec_138',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      rawText: `Negotiable Instruments Act, 1881 (NI Act)
CHAPTER XVII — PENALTIES IN CASE OF DISHONOUR OF CHEQUES

Section 138 — Dishonour of cheque for insufficiency of funds in the account:
Where any cheque drawn by a person on an account maintained by him with a banker for payment of any money to another person from out of that account for the discharge, in whole or in part, of any debt or other liability, is returned by the bank unpaid, either because of the amount of money standing to the credit of that account is insufficient to honour the cheque or that it exceeds the amount arranged to be paid from that account.

STATUTORY PREREQUISITES AND TIME LIMITS UNDER SECTION 138:
1. Presentation of Cheque: The cheque must have been presented to the bank within a period of three months from the date on which it is drawn or within the period of its validity.
2. Bank Memo: The cheque must have been returned unpaid by the bank with a return memo (e.g. 'Funds Insufficient', 'Account Closed', 'Exceeds Arrangement').
3. Statutory Demand Notice: The payee or the holder in due course of the cheque must make a demand for the payment of the said amount of money by giving a notice in writing to the drawer of the cheque within thirty (30) days of receipt of information by him from the bank regarding the return of the cheque as unpaid.
4. Cure Period: The drawer of such cheque must fail to make the payment of the said amount of money to the payee within fifteen (15) days of the receipt of the said notice.
5. Limitation for Filing Complaint: If the drawer fails to make payment within 15 days of receiving the notice, a criminal complaint under Section 142 must be filed before the Judicial Magistrate of First Class or Metropolitan Magistrate within thirty (30) days from the date of the expiry of the 15-day period.

PUNISHMENT UNDER SECTION 138 NI ACT:
Punishable with imprisonment for a term which may be extended to two (2) years, or with fine which may extend to twice the amount of the cheque, or with both.
Nature: Non-Cognizable, Bailable, Compoundable under Section 147 NI Act.

Section 139 — Presumption in favour of holder:
It shall be presumed, unless the contrary is proved, that the holder of a cheque received the cheque of the nature referred to in Section 138 for the discharge, in whole or in part, of any legally enforceable debt or other liability.`,
    },
    {
      doc: {
        id: 'doc_it_act_cyber_01',
        title: 'Information Technology Act, 2000 - Cyber Crimes, Phishing & Identity Theft',
        source: 'Ministry of Electronics & Information Technology, Government of India',
        jurisdiction: 'India',
        document_type: 'STATUTE',
        version: 'IT Act 2000 §§ 43, 66, 66C, 66D, 67',
        effective_date: '2000-10-17',
        status: 'ACTIVE',
        checksum: 'sha256_it_act_cyber_crimes',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      rawText: `Information Technology Act, 2000 (IT Act)
CHAPTER IX & XI — PENALTIES, ADJUDICATION AND CYBER OFFENSES

Section 43 — Penalty and compensation for damage to computer system:
If any person without permission of the owner or person in charge: accesses or secures access to computer, computer system or computer network; downloads, copies or extracts any data; introduces any computer contaminant or virus; damages or disrupts computer services; he shall be liable to pay damages by way of compensation to the person so affected.

Section 66 — Computer related offenses:
If any person, dishonestly or fraudulently, does any act referred to in Section 43, he shall be punishable with imprisonment for a term which may extend to three years or with fine which may extend to five lakh rupees or with both.

Section 66C — Punishment for identity theft:
Whoever, fraudulently or dishonestly make use of the electronic signature, password or any other unique identification feature of any other person, shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to one lakh rupees.

Section 66D — Punishment for cheating by personation by using computer resource:
Whoever, by means of any communication device or computer resource, cheats by personation (including online financial fraud, UPI scams, fake bank links, or phishing), shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to one lakh rupees.`,
    },
    {
      doc: {
        id: 'doc_consumer_protection_01',
        title: 'Consumer Protection Act, 2019 - Consumer Rights and Dispute Redressal Commissions',
        source: 'Ministry of Consumer Affairs, Government of India',
        jurisdiction: 'India',
        document_type: 'STATUTE',
        version: 'Consumer Protection Act 2019 (Act No. 35 of 2019)',
        effective_date: '2020-07-20',
        status: 'ACTIVE',
        checksum: 'sha256_consumer_protection_act_2019',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      rawText: `Consumer Protection Act, 2019
CHAPTER II & IV — CONSUMER RIGHTS AND DISPUTE REDRESSAL COMMISSIONS

Section 2(9) — Consumer Rights:
(i) The right to be protected against the marketing of goods, products or services which are hazardous to life and property;
(ii) The right to be informed about the quality, quantity, potency, purity, standard and price of goods, products or services;
(iii) The right to be assured of access to a variety of goods, products or services at competitive prices;
(iv) The right to be heard and assured that consumer interests will receive due consideration in appropriate fora;
(v) The right to seek redressal against unfair trade practice or restrictive trade practices or unscrupulous exploitation;
(vi) The right to consumer awareness.

PECUNIARY JURISDICTION OF CONSUMER COMMISSIONS:
1. District Consumer Disputes Redressal Commission: Complaints where the value of goods or services paid as consideration does not exceed fifty lakh rupees (Rs. 50,00,000).
2. State Consumer Disputes Redressal Commission: Complaints where consideration exceeds fifty lakh rupees but does not exceed two crore rupees (Rs. 2,00,00,000).
3. National Consumer Disputes Redressal Commission (NCDRC): Complaints where consideration exceeds two crore rupees (Rs. 2,00,00,000).

Product Liability & E-Commerce: Sellers and manufacturers are strictly liable for harm caused by defective products or deficient services.`,
    },
    {
      doc: {
        id: 'doc_gdpr_01',
        title: 'General Data Protection Regulation (GDPR) - Chapter III',
          source: 'Official Journal of the European Union (EUR-Lex)',
          jurisdiction: 'European Union',
          document_type: 'REGULATION',
          version: 'Regulation (EU) 2016/679',
          effective_date: '2018-05-25',
          status: 'ACTIVE',
          checksum: 'sha256_gdpr_ch3_2016_679',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        rawText: `General Data Protection Regulation (EU) 2016/679
CHAPTER III — RIGHTS OF THE DATA SUBJECT

Article 12 — Transparent information, communication and modalities for the exercise of the rights of the data subject
1. The controller shall take appropriate measures to provide any information referred to in Articles 13 and 14 and any communication under Articles 15 to 22 and 34 relating to processing to the data subject in a concise, transparent, intelligible and easily accessible form, using clear and plain language. The information shall be provided in writing, or by other means, including, where appropriate, by electronic means.
2. The controller shall facilitate the exercise of data subject rights under Articles 15 to 22. In the cases referred to in Article 11(2), the controller shall not refuse to act on the request of the data subject for exercising his or her rights under Articles 15 to 22, unless the controller demonstrates that it is not in a position to identify the data subject.
3. The controller shall provide information on action taken on a request under Articles 15 to 22 to the data subject without undue delay and in any event within one month of receipt of the request. That period may be extended by two further months where necessary, taking into account the complexity and number of the requests.

Article 15 — Right of access by the data subject
1. The data subject shall have the right to obtain from the controller confirmation as to whether or not personal data concerning him or her are being processed, and, where that is the case, access to the personal data and the following information:
(a) the purposes of the processing;
(b) the categories of personal data concerned;
(c) the recipients or categories of recipient to whom the personal data have been or will be disclosed, in particular recipients in third countries or international organisations;
(d) where possible, the envisaged period for which the personal data will be stored, or, if not possible, the criteria used to determine that period;
(e) the existence of the right to request from the controller rectification or erasure of personal data or restriction of processing of personal data concerning the data subject or to object to such processing;
(f) the right to lodge a complaint with a supervisory authority.

Article 17 — Right to erasure ('right to be forgotten')
1. The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay and the controller shall have the obligation to erase personal data without undue delay where one of the following grounds applies:
(a) the personal data are no longer necessary in relation to the purposes for which they were collected or otherwise processed;
(b) the data subject withdraws consent on which the processing is based according to point (a) of Article 6(1), or point (a) of Article 9(2), and where there is no other legal ground for the processing;
(c) the data subject objects to the processing pursuant to Article 21(1) and there are no overriding legitimate grounds for the processing;
(d) the personal data have been unlawfully processed;
(e) the personal data have to be erased for compliance with a legal obligation in Union or Member State law to which the controller is subject.
2. Paragraph 1 shall not apply to the extent that processing is necessary:
(a) for exercising the right of freedom of expression and information;
(b) for compliance with a legal obligation which requires processing by Union or Member State law;
(c) for reasons of public interest in the area of public health;
(d) for the establishment, exercise or defence of legal claims.

Article 20 — Right to data portability
1. The data subject shall have the right to receive the personal data concerning him or her, which he or she has provided to a controller, in a structured, commonly used and machine-readable format and have the right to transmit those data to another controller without hindrance from the controller to which the personal data have been provided, where:
(a) the processing is based on consent pursuant to point (a) of Article 6(1) or point (a) of Article 9(2) or on a contract pursuant to point (b) of Article 6(1); and
(b) the processing is carried out by automated means.`,
      },
      {
        doc: {
          id: 'doc_ccpa_01',
          title: 'California Consumer Privacy Act (CCPA) - Title 1.81.5',
          source: 'California Civil Code Title 1.81.5',
          jurisdiction: 'United States (California)',
          document_type: 'STATUTE',
          version: 'Cal. Civ. Code § 1798.100 - 1798.199',
          effective_date: '2020-01-01',
          status: 'ACTIVE',
          checksum: 'sha256_ccpa_title_1_81_5',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        rawText: `California Consumer Privacy Act (CCPA)
California Civil Code Part 4 of Division 3

Section 1798.100 — General Duties under CCPA and Right to Know
(a) A business that controls the collection of a consumer's personal information shall, at or before the point of collection, inform the consumer as to:
(1) The categories of personal information to be collected and the purposes for which the categories of personal information are collected or used and whether that information is sold or shared.
(2) If the business collects sensitive personal information, the categories of sensitive personal information to be collected and the purposes for which the categories of sensitive personal information are collected or used.
(3) The length of time the business intends to retain each category of personal information, or if that is not possible, the criteria used to determine that period.
(b) A business shall not collect categories of personal information other than those disclosed pursuant to subdivision (a).
(c) A consumer shall have the right to request that a business that collects personal information about the consumer disclose to the consumer the personal information that it has collected about that consumer.

Section 1798.105 — Consumers' Right to Delete Personal Information
(a) A consumer shall have the right to request that a business delete any personal information about the consumer which the business has collected from the consumer.
(b) A business that collects personal information about consumers shall disclose, pursuant to Section 1798.130, the consumer's rights to request the deletion of the consumer's personal information.
(c) A business that receives a verifiable consumer request from a consumer to delete the consumer's personal information pursuant to subdivision (a) of this section shall delete the consumer's personal information from its records and direct any service providers to delete the consumer's personal information from their records.
(d) A business or a service provider is not required to comply with a consumer's request to delete the consumer's personal information if it is reasonably necessary for the business or service provider to maintain the consumer's personal information in order to:
(1) Complete the transaction for which the personal information was collected, fulfill the terms of a written warranty or product recall, or provide a good or service requested by the consumer.
(2) Detect security incidents, protect against malicious, deceptive, fraudulent, or illegal activity, or prosecute those responsible for that activity.
(3) Comply with the California Electronic Communications Privacy Act pursuant to Chapter 3.6 (commencing with Section 1546) of Title 12 of Part 2 of the Penal Code.
(4) Comply with a legal obligation.

Section 1798.120 — Consumers' Right to Opt-Out of Sale or Sharing
(a) A consumer shall have the right, at any time, to direct a business that sells or shares personal information about the consumer to third parties not to sell or share the consumer's personal information. This right may be referred to as the right to opt-out of sale or sharing.
(b) A business that sells consumers' personal information to, or shares it with, third parties shall provide notice to consumers, pursuant to subdivision (a) of Section 1798.135, that this information may be sold or shared and that consumers have the right to opt-out of the sale or sharing of their personal information.
(c) A business shall not sell or share the personal information of consumers if the business has actual knowledge that the consumer is less than 16 years of age, unless the consumer, in the case of consumers at least 13 years of age and less than 16 years of age, or the consumer's parent or guardian, in the case of consumers who are less than 13 years of age, has affirmatively authorized the sale or sharing.`,
      },
      {
        doc: {
          id: 'doc_ucc_01',
          title: 'Uniform Commercial Code (UCC) - Article 2 Sales Warranties',
          source: 'Uniform Law Commission / American Law Institute',
          jurisdiction: 'United States (Uniform State Law)',
          document_type: 'STATUTE',
          version: 'UCC Article 2 Part 3 (General Obligation and Construction of Contract)',
          effective_date: '2002-01-01',
          status: 'ACTIVE',
          checksum: 'sha256_ucc_art2_warranties',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        rawText: `Uniform Commercial Code (UCC) — Article 2 Sales
PART 3 — GENERAL OBLIGATION AND CONSTRUCTION OF CONTRACT

Section 2-313 — Express Warranties by Affirmation, Promise, Description, Sample
(1) Express warranties by the seller are created as follows:
(a) Any affirmation of fact or promise made by the seller to the buyer which relates to the goods and becomes part of the basis of the bargain creates an express warranty that the goods shall conform to the affirmation or promise.
(b) Any description of the goods which is made part of the basis of the bargain creates an express warranty that the goods shall conform to the description.
(c) Any sample or model which is made part of the basis of the bargain creates an express warranty that the whole of the goods shall conform to the sample or model.
(2) It is not necessary to the creation of an express warranty that the seller use formal words such as 'warrant' or 'guarantee' or that he have a specific intention to make a warranty, but an affirmation merely of the value of the goods or a statement purporting to be merely the seller's opinion or commendation of the goods does not create a warranty.

Section 2-314 — Implied Warranty: Merchantability; Usage of Trade
(1) Unless excluded or modified (Section 2-316), a warranty that the goods shall be merchantable is implied in a contract for their sale if the seller is a merchant with respect to goods of that kind. Under this section the serving for value of food or drink to be consumed either on the premises or elsewhere is a sale.
(2) Goods to be merchantable must be at least such as:
(a) pass without objection in the trade under the contract description; and
(b) in the case of fungible goods, are of fair average quality within the description; and
(c) are fit for the ordinary purposes for which such goods are used; and
(d) run, within the variations permitted by the agreement, of even kind, quality and quantity within each unit and among all units involved; and
(e) are adequately contained, packaged, and labeled as the agreement may require; and
(f) conform to the promise or affirmations of fact made on the container or label if any.
(3) Unless excluded or modified (Section 2-316) other implied warranties may arise from course of dealing or usage of trade.

Section 2-315 — Implied Warranty: Fitness for Particular Purpose
Where the seller at the time of contracting has reason to know any particular purpose for which the goods are required and that the buyer is relying on the seller's skill or judgment to select or furnish suitable goods, there is unless excluded or modified under the next section an implied warranty that the goods shall be fit for such purpose.

Section 2-316 — Exclusion or Modification of Warranties
(1) Words or conduct relevant to the creation of an express warranty and words or conduct tending to negate or limit warranty shall be construed wherever reasonable as consistent with each other; but subject to the provisions of this Article on parol or extrinsic evidence negation or limitation is inoperative to the extent that such construction is unreasonable.
(2) Subject to subsection (3), to exclude or modify the implied warranty of merchantability or any part of it the language must mention merchantability and in case of a writing must be conspicuous, and to exclude or modify any implied warranty of fitness the exclusion must be by a writing and conspicuous. Language to exclude all implied warranties of fitness is sufficient if it states, for example, that 'There are no warranties which extend beyond the description on the face hereof.'
(3) Notwithstanding subsection (2):
(a) unless the circumstances indicate otherwise, all implied warranties are excluded by expressions like 'as is', 'with all faults' or other language which in common understanding calls the buyer's attention to the exclusion of warranties and makes plain that there is no implied warranty; and
(b) when the buyer before entering into the contract has examined the goods or the sample or model as fully as he desired or has refused to examine the goods there is no implied warranty with regard to defects which an examination ought in the circumstances to have revealed to him.`,
      },
      {
        doc: {
          id: 'doc_dmca_01',
          title: 'Digital Millennium Copyright Act (DMCA) - 17 U.S.C. § 512',
          source: 'United States Code (Title 17 - Copyrights)',
          jurisdiction: 'United States (Federal)',
          document_type: 'STATUTE',
          version: '17 U.S.C. § 512 (Online Copyright Infringement Liability Limitation Act)',
          effective_date: '1998-10-28',
          status: 'ACTIVE',
          checksum: 'sha256_dmca_17_usc_512',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        rawText: `United States Code — Title 17 (Copyrights)
Section 512 — Limitations on liability relating to material online (DMCA Safe Harbors)

Section 512(c) — Information Residing on Systems or Networks At Direction of Users
(1) In general. — A service provider shall not be liable for monetary relief, or, except as provided in subsection (j), for injunctive or other equitable relief, for infringement of copyright by reason of the storage at the direction of a user of material that resides on a system or network controlled or operated by or for the service provider, if the service provider:
(A)(i) does not have actual knowledge that the material or an activity using the material on the system or network is infringing;
(ii) in the absence of such actual knowledge, is not aware of facts or circumstances from which infringing activity is apparent; or
(iii) upon obtaining such knowledge or awareness, acts expeditiously to remove, or disable access to, the material;
(B) does not receive a financial benefit directly attributable to the infringing activity, in a case in which the service provider has the right and ability to control such activity; and
(C) upon notification of claimed infringement as described in paragraph (3), responds expeditiously to remove, or disable access to, the material that is claimed to be infringing or to be the subject of infringing activity.
(2) Designated agent. — The limitations on liability established in this subsection apply to a service provider only if the service provider has designated an agent to receive notifications of claimed infringement, by making available through its service, including on its website in a location accessible to the public, and by providing to the Copyright Office, substantially the following information:
(A) the name, address, phone number, and electronic mail address of the agent.
(B) other contact information which the Register of Copyrights may deem appropriate.

Section 512(c)(3) — Elements of Notification (Takedown Notice)
(A) To be effective under this subsection, a notification of claimed infringement must be a written communication provided to the designated agent of a service provider that includes substantially the following:
(i) A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
(ii) Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works at a single online site are covered by a single notification, a representative list of such works at that site.
(iii) Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit the service provider to locate the material.
(iv) Information reasonably sufficient to permit the service provider to contact the complaining party, such as an address, telephone number, and, if available, an electronic mail address.
(v) A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
(vi) A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.`,
      },
    ];

    const docsToSeed = sampleDocuments.filter(item => !existingDocIds.has(item.doc.id));

    if (docsToSeed.length > 0) {
      console.log(`Seeding ${docsToSeed.length} new legal documents...`);
      for (const item of docsToSeed) {
        db.addDocument(item.doc);
        const rawChunks = DocumentChunker.chunkDocument(item.doc, item.rawText);
        const texts = rawChunks.map(c => c.content);
        const embeddings = await embeddingService.embedDocuments(texts);

        const chunksWithEmbeddings = rawChunks.map((c, i) => ({
          ...c,
          embedding: embeddings[i] || [],
        }));

        db.addChunks(chunksWithEmbeddings);
        console.log(`Ingested and indexed ${item.doc.title} (${chunksWithEmbeddings.length} chunks)`);
      }

      db.addIngestionJob({
        id: `job_seed_${Date.now()}`,
        document_id: 'doc_all_initial',
        document_title: 'Legal Repository Corpus Seed / Expansion',
        status: 'COMPLETED',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        chunk_count: db.getChunks().length,
      });
    }
  }
