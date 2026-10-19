import { NativeModules } from 'react-native';

const mockSetSecureScreen = jest.fn(async (_enabled: boolean) => true);
NativeModules.AppSecurity = { setSecureScreen: mockSetSecureScreen };

import * as Keychain from 'react-native-keychain';

import {
  getLockStatus,
  handleAppStateChange,
  initLock,
  LOCK_GRACE_MS,
  resetLockStoreForTests,
  turnLockOff,
  turnLockOn,
  unlock,
} from '../lockStore';

describe('bloqueio do app', () => {
  it('começa desligado quando nunca foi ativado', async () => {
    await initLock();
    expect(getLockStatus()).toBe('disabled');
  });

  it('ligar pede a digital, liga a proteção dos recentes e libera o app', async () => {
    await turnLockOn();
    expect(getLockStatus()).toBe('unlocked');
    expect(mockSetSecureScreen).toHaveBeenLastCalledWith(true);

    // Na próxima abertura, começa travado.
    await initLock();
    expect(getLockStatus()).toBe('locked');
    expect(await unlock()).toBe(true);
    expect(getLockStatus()).toBe('unlocked');
  });

  it('só trava de novo depois de 1 minuto fora do app', () => {
    resetLockStoreForTests('unlocked');
    handleAppStateChange('background', 0);
    handleAppStateChange('active', LOCK_GRACE_MS - 1000);
    expect(getLockStatus()).toBe('unlocked');

    handleAppStateChange('background', 0);
    handleAppStateChange('active', LOCK_GRACE_MS + 1000);
    expect(getLockStatus()).toBe('locked');
  });

  it('digital cancelada mantém o app travado', async () => {
    resetLockStoreForTests('locked');
    jest
      .mocked(Keychain.getGenericPassword)
      .mockRejectedValueOnce(new Error('cancelado'));
    expect(await unlock()).toBe(false);
    expect(getLockStatus()).toBe('locked');
  });

  it('desligar pede a digital e tira a proteção dos recentes', async () => {
    resetLockStoreForTests('unlocked');
    await turnLockOff();
    expect(getLockStatus()).toBe('disabled');
    expect(mockSetSecureScreen).toHaveBeenLastCalledWith(false);
    await initLock();
    expect(getLockStatus()).toBe('disabled');
  });

  it('não liga sem bloqueio de tela configurado no celular', async () => {
    jest.mocked(Keychain.isPasscodeAuthAvailable).mockResolvedValueOnce(false);
    await expect(turnLockOn()).rejects.toThrow('bloqueio de tela');
    await initLock();
    expect(getLockStatus()).toBe('disabled');
  });
});
