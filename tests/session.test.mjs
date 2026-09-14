import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSession, verifySession } from '../src/node-session.js';

test('signed session round-trips user identity and role',()=>{
  const token=makeSession({id:'u1',email:'a@example.com',displayName:'Ada',role:'admin'},60);
  const session=verifySession(token);
  assert.equal(session.id,'u1');
  assert.equal(session.role,'admin');
  assert.equal(session.email,'a@example.com');
});

test('tampered signed session is rejected',()=>{
  const token=makeSession({id:'u1',email:'a@example.com',displayName:'Ada',role:'manager'},60);
  const [payload,sig]=token.split('.');
  assert.equal(verifySession(`${payload}x.${sig}`),null);
});
