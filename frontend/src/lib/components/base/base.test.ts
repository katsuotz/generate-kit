import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.svelte';
import CheckboxField from './CheckboxField.svelte';
import RadioCard from './RadioCard.svelte';
import SelectField from './SelectField.svelte';
import TextField from './TextField.svelte';
import TextareaField from './TextareaField.svelte';

describe('base controls', () => {
  it('associates field errors with the native control', () => {
    render(TextField, {
      label: 'Full name',
      path: 'identity.fullName',
      error: 'Enter your full name.'
    });

    const input = screen.getByRole('textbox', { name: /full name/i });
    expect(input).toHaveAttribute('id', 'field-identity-fullname');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('field-identity-fullname-error');
    expect(screen.getByText('Enter your full name.')).toHaveAttribute(
      'id',
      'field-identity-fullname-error'
    );
  });

  it('supports callback and native event usage for buttons', async () => {
    const onClick = vi.fn();
    render(Button, { onClick });

    await fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('exposes disabled and loading states', () => {
    render(Button, { loading: true, disabled: false });

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('propagates textarea values and validation attributes', async () => {
    render(TextareaField, { label: 'Summary', required: true, value: '' });
    const textarea = screen.getByRole('textbox', { name: /summary/i });

    expect(textarea).toBeRequired();
    await fireEvent.input(textarea, { target: { value: 'A concise summary.' } });
    expect(textarea).toHaveValue('A concise summary.');
  });

  it('propagates select and checkbox state', async () => {
    render(SelectField, {
      label: 'Type',
      value: 'website',
      options: [
        { value: 'website', label: 'Website' },
        { value: 'github', label: 'GitHub' }
      ]
    });
    const select = screen.getByRole('combobox', { name: 'Type' });
    await fireEvent.change(select, { target: { value: 'github' } });
    expect(select).toHaveValue('github');

    render(CheckboxField, { label: 'Current role' });
    const checkbox = screen.getByRole('checkbox', { name: 'Current role' });
    await fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('reports the selected radio card value', async () => {
    const onChange = vi.fn();
    render(RadioCard, {
      label: 'Editorial',
      description: 'A quiet layout',
      name: 'template',
      value: 'editorial',
      onChange
    });

    await fireEvent.click(screen.getByRole('radio', { name: /editorial/i }));
    expect(onChange).toHaveBeenCalledWith('editorial');
  });
});
