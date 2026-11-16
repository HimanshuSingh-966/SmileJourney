import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  validateSignUpForm,
  validateLoginForm,
  getFirebaseAuthErrorMessage,
} from './authValidation.ts';

test('validateEmail validates RFC compliant emails and catches blanks or invalid syntax', () => {
  assert.equal(validateEmail('').isValid, false);
  assert.equal(validateEmail('   ').isValid, false);
  assert.equal(validateEmail('not-an-email').isValid, false);
  assert.equal(validateEmail('user@').isValid, false);
  assert.equal(validateEmail('@domain.com').isValid, false);
  assert.equal(validateEmail('user@domain').isValid, false);

  assert.equal(validateEmail('test@example.com').isValid, true);
  assert.equal(validateEmail('dr.smile+wellness@care.dental.org').isValid, true);
});

test('validatePassword enforces minimum length and gauges strength accurately', () => {
  const emptyRes = validatePassword('');
  assert.equal(emptyRes.isValid, false);

  const shortRes = validatePassword('12345');
  assert.equal(shortRes.isValid, false);
  assert.equal(shortRes.error, 'Password must be at least 6 characters.');

  const sixSimple = validatePassword('abcdef');
  assert.equal(sixSimple.isValid, true);
  assert.equal(sixSimple.strength, 'weak');

  const strongPass = validatePassword('SmileCare#2026!');
  assert.equal(strongPass.isValid, true);
  assert.equal(strongPass.strength, 'strong');
});

test('validateSignUpForm checks name, email, password and matching confirmation', () => {
  const invalid = validateSignUpForm({
    name: '',
    email: 'bademail',
    password: '123',
    confirmPassword: '456',
  });

  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);
  assert.ok(invalid.errors.confirmPassword);

  const valid = validateSignUpForm({
    name: 'Maya Lin',
    email: 'maya@example.com',
    password: 'SecretPassword123',
    confirmPassword: 'SecretPassword123',
  });

  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('validateLoginForm verifies presence of credentials', () => {
  const blank = validateLoginForm({ email: '', password: '' });
  assert.equal(blank.isValid, false);

  const good = validateLoginForm({ email: 'dr.maya@smile.com', password: 'mySecurePassword' });
  assert.equal(good.isValid, true);
});

test('getFirebaseAuthErrorMessage maps Firebase codes to helpful user messages', () => {
  assert.match(
    getFirebaseAuthErrorMessage({ code: 'auth/email-already-in-use' }),
    /already exists/
  );
  assert.match(
    getFirebaseAuthErrorMessage({ code: 'auth/invalid-credential' }),
    /Incorrect email or password/
  );
  assert.match(
    getFirebaseAuthErrorMessage({ code: 'auth/weak-password' }),
    /too weak/
  );
  assert.match(
    getFirebaseAuthErrorMessage({ code: 'auth/operation-not-allowed' }),
    /Firebase Console/
  );
});
