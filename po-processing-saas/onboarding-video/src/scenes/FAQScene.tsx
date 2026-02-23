import React from 'react';
import { SceneContainer } from '../components/SceneContainer';
import { FAQItem } from '../components/FAQItem';

const faqs = [
  {
    question: 'What PDF formats are supported?',
    answer: 'Standard PDF files up to 10MB. Single or multi-page purchase orders from any vendor.',
    delay: 15,
  },
  {
    question: 'How accurate is AI extraction?',
    answer: '85-95% accuracy with Claude Vision. Low-confidence items route to operator review.',
    delay: 35,
  },
  {
    question: 'Does the system learn over time?',
    answer: 'Yes. Operator corrections feed back into vendor templates and improve future matches.',
    delay: 55,
  },
  {
    question: 'Is my data secure?',
    answer: 'End-to-end encryption, row-level security, and SOC 2 compliant infrastructure.',
    delay: 75,
  },
];

export const FAQScene: React.FC = () => {
  return (
    <SceneContainer
      title="Frequently Asked Questions"
      subtitle="Quick answers to common questions about the platform"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          flex: 1,
          alignContent: 'center',
        }}
      >
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            delay={faq.delay}
          />
        ))}
      </div>
    </SceneContainer>
  );
};
