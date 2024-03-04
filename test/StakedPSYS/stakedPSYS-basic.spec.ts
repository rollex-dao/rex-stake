import { makeSuite, TestEnv } from '../helpers/make-suite';
import {
  COOLDOWN_SECONDS,
  UNSTAKE_WINDOW,
  MAX_UINT_AMOUNT,
  STAKED_PSYS_NAME,
  STAKED_PSYS_SYMBOL,
  STAKED_PSYS_DECIMALS,
} from '../../helpers/constants';
import { waitForTx, timeLatest, advanceBlock, increaseTimeAndMine } from '../../helpers/misc-utils';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { compareRewardsAtAction } from './data-helpers/reward';
import { getUserIndex } from '../DistributionManager/data-helpers/asset-user-data';
import { getRewards } from '../DistributionManager/data-helpers/base-math';
import { logPSYStokenBalanceOf } from './data-helpers/loggers';

const { expect } = require('chai');

makeSuite('StakedPSYS. Basics', (testEnv: TestEnv) => {
  it('Initial configuration after initialize() is correct', async () => {
    const { StakedPSYS, psysToken, rewardsVault } = testEnv;

    expect(await StakedPSYS.name()).to.be.equal(STAKED_PSYS_NAME);
    expect(await StakedPSYS.symbol()).to.be.equal(STAKED_PSYS_SYMBOL);
    expect(await StakedPSYS.decimals()).to.be.equal(STAKED_PSYS_DECIMALS);
    expect(await StakedPSYS.REVISION()).to.be.equal(1);
    expect(await StakedPSYS.STAKED_TOKEN()).to.be.equal(psysToken.address);
    expect(await StakedPSYS.REWARD_TOKEN()).to.be.equal(psysToken.address);
    expect((await StakedPSYS.COOLDOWN_SECONDS()).toString()).to.be.equal(COOLDOWN_SECONDS);
    expect((await StakedPSYS.UNSTAKE_WINDOW()).toString()).to.be.equal(UNSTAKE_WINDOW);
    expect(await StakedPSYS.REWARDS_VAULT()).to.be.equal(rewardsVault.address);
  });

  it('Reverts trying to stake 0 amount', async () => {
    const {
      StakedPSYS,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(
      StakedPSYS.connect(staker.signer).stake(staker.address, amount)
    ).to.be.revertedWith('INVALID_ZERO_AMOUNT');
  });

  it('Reverts trying to activate cooldown with 0 staked amount', async () => {
    const {
      StakedPSYS,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(StakedPSYS.connect(staker.signer).cooldown()).to.be.revertedWith(
      'INVALID_BALANCE_ON_COOLDOWN'
    );
  });

  it('User 1 stakes 50 PSYS: receives 50 SPSYS, StakedPSYS balance of PSYS is 50 and his rewards to claim are 0', async () => {
    const {
      StakedPSYS,
      psysToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('50');

    const saveBalanceBefore = new BigNumber(
      (await StakedPSYS.balanceOf(staker.address)).toString()
    );

    // Prepare actions for the test case
    const actions = () => [
      psysToken.connect(staker.signer).approve(StakedPSYS.address, amount),
      StakedPSYS.connect(staker.signer).stake(staker.address, amount),
    ];

    // Check rewards
    await compareRewardsAtAction(StakedPSYS, staker.address, actions);

    // Stake token tests
    expect((await StakedPSYS.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await psysToken.balanceOf(StakedPSYS.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await StakedPSYS.balanceOf(staker.address)).toString()).to.be.equal(amount);
    expect((await psysToken.balanceOf(StakedPSYS.address)).toString()).to.be.equal(amount);
  });

  it('User 1 stakes 20 PSYS more: his total SPSYS balance increases, StakedPSYS balance of PSYS increases and his reward until now get accumulated', async () => {
    const {
      StakedPSYS,
      psysToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('20');

    const saveBalanceBefore = new BigNumber(
      (await StakedPSYS.balanceOf(staker.address)).toString()
    );
    const actions = () => [
      psysToken.connect(staker.signer).approve(StakedPSYS.address, amount),
      StakedPSYS.connect(staker.signer).stake(staker.address, amount),
    ];

    // Checks rewards
    await compareRewardsAtAction(StakedPSYS, staker.address, actions, true);

    // Extra test checks
    expect((await StakedPSYS.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await psysToken.balanceOf(StakedPSYS.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
  });

  it('User 1 claim half rewards ', async () => {
    const {
      StakedPSYS,
      psysToken,
      users: [, staker],
    } = testEnv;
    // Increase time for bigger rewards
    await increaseTimeAndMine(1000);

    const halfRewards = (await StakedPSYS.stakerRewardsToClaim(staker.address)).div(2);
    const saveUserBalance = await psysToken.balanceOf(staker.address);

    await StakedPSYS.connect(staker.signer).claimRewards(staker.address, halfRewards);

    const userBalanceAfterActions = await psysToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance.add(halfRewards))).to.be.ok;
  });

  it('User 1 tries to claim higher reward than current rewards balance', async () => {
    const {
      StakedPSYS,
      psysToken,
      users: [, staker],
    } = testEnv;

    const saveUserBalance = await psysToken.balanceOf(staker.address);

    // Try to claim more amount than accumulated
    await expect(
      StakedPSYS.connect(staker.signer).claimRewards(
        staker.address,
        ethers.utils.parseEther('10000')
      )
    ).to.be.revertedWith('INVALID_AMOUNT');

    const userBalanceAfterActions = await psysToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance)).to.be.ok;
  });

  it('User 1 claim all rewards', async () => {
    const {
      StakedPSYS,
      psysToken,
      users: [, staker],
    } = testEnv;

    const userAddress = staker.address;
    const underlyingAsset = StakedPSYS.address;

    const userBalance = await StakedPSYS.balanceOf(userAddress);
    const userPSYSBalance = await psysToken.balanceOf(userAddress);
    const userRewards = await StakedPSYS.stakerRewardsToClaim(userAddress);
    // Get index before actions
    const userIndexBefore = await getUserIndex(StakedPSYS, userAddress, underlyingAsset);

    // Claim rewards
    await expect(StakedPSYS.connect(staker.signer).claimRewards(staker.address, MAX_UINT_AMOUNT));

    // Get index after actions
    const userIndexAfter = await getUserIndex(StakedPSYS, userAddress, underlyingAsset);

    const expectedAccruedRewards = getRewards(
      userBalance,
      userIndexAfter,
      userIndexBefore
    ).toString();
    const userPSYSBalanceAfterAction = (await psysToken.balanceOf(userAddress)).toString();

    expect(userPSYSBalanceAfterAction).to.be.equal(
      userPSYSBalance.add(userRewards).add(expectedAccruedRewards).toString()
    );
  });

  it('User 6 stakes 50 PSYS, with the rewards not enabled', async () => {
    const { StakedPSYS, psysToken, users } = testEnv;
    const amount = ethers.utils.parseEther('50');
    const sixStaker = users[5];

    // Disable rewards via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      psysToken.connect(sixStaker.signer).approve(StakedPSYS.address, amount),
      StakedPSYS.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedPSYS, sixStaker.address, actions, false, assetsConfig);

    // Check expected stake balance for six staker
    expect((await StakedPSYS.balanceOf(sixStaker.address)).toString()).to.be.equal(
      amount.toString()
    );

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedPSYS.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('User 6 stakes 30 PSYS more, with the rewards not enabled', async () => {
    const { StakedPSYS, psysToken, users } = testEnv;
    const amount = ethers.utils.parseEther('30');
    const staker = users[1];
    const sixStaker = users[5];
    const saveBalanceBefore = new BigNumber(
      (await StakedPSYS.balanceOf(sixStaker.address)).toString()
    );
    // Keep rewards disabled via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      psysToken.connect(sixStaker.signer).approve(StakedPSYS.address, amount),
      StakedPSYS.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedPSYS, sixStaker.address, actions, false, assetsConfig);

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedPSYS.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('Validates staker cooldown with stake() while being on valid unstake window', async () => {
    const { StakedPSYS, psysToken, users } = testEnv;
    const amount1 = ethers.utils.parseEther('50');
    const amount2 = ethers.utils.parseEther('20');
    const staker = users[4];

    // Checks rewards
    const actions = () => [
      psysToken.connect(staker.signer).approve(StakedPSYS.address, amount1.add(amount2)),
      StakedPSYS.connect(staker.signer).stake(staker.address, amount1),
    ];

    await compareRewardsAtAction(StakedPSYS, staker.address, actions, false);

    await StakedPSYS.connect(staker.signer).cooldown();

    const cooldownActivationTimestamp = await timeLatest();

    await advanceBlock(
      cooldownActivationTimestamp.plus(new BigNumber(COOLDOWN_SECONDS).plus(1000)).toNumber()
    ); // We fast-forward time to just after the unstake window

    const stakerCooldownTimestampBefore = new BigNumber(
      (await StakedPSYS.stakersCooldowns(staker.address)).toString()
    );
    await waitForTx(await StakedPSYS.connect(staker.signer).stake(staker.address, amount2));
    const latestTimestamp = await timeLatest();
    const expectedCooldownTimestamp = amount2
      .mul(latestTimestamp.toString())
      .add(amount1.mul(stakerCooldownTimestampBefore.toString()))
      .div(amount2.add(amount1));
    expect(expectedCooldownTimestamp.toString()).to.be.equal(
      (await StakedPSYS.stakersCooldowns(staker.address)).toString()
    );
  });
});
