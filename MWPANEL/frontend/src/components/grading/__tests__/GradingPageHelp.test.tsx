import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GradingPageHelp } from '../GradingPageHelp';

describe('GradingPageHelp', () => {
  const props = {
    title: 'Test Title',
    whatIs: 'What it is text',
    steps: ['Step one', 'Step two'],
    purpose: 'Purpose text',
    levels: [{ label: '3', color: 'gold', meaning: 'Adecuado' }],
  };

  it('renders title', () => {
    render(<GradingPageHelp {...props} />);
    expect(screen.getByText('Test Title')).toBeTruthy();
  });

  it('renders a step', () => {
    render(<GradingPageHelp {...props} />);
    expect(screen.getByText('Step one')).toBeTruthy();
  });

  it('renders level label', () => {
    render(<GradingPageHelp {...props} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders level meaning', () => {
    render(<GradingPageHelp {...props} />);
    expect(screen.getByText('Adecuado')).toBeTruthy();
  });
});
