import { makeSuite, TestEnv } from '../helpers/make-suite';
import {
  COOLDOWN_SECONDS,
  UNSTAKE_WINDOW,
  MAX_UINT_AMOUNT,
  STAKED_REX_NAME,
  STAKED_REX_SYMBOL,
  STAKED_REX_DECIMALS,
} from '../../helpers/constants';
import { waitForTx, timeLatest, advanceBlock, increaseTimeAndMine } from '../../helpers/misc-utils';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { compareRewardsAtAction } from './data-helpers/reward';
import { getUserIndex } from '../DistributionManager/data-helpers/asset-user-data';
import { getRewards } from '../DistributionManager/data-helpers/base-math';
import { logREXtokenBalanceOf } from './data-helpers/loggers';

const { expect } = require('chai');

makeSuite('StakedREX. Basics', (testEnv: TestEnv) => {
  it('Initial configuration after initialize() is correct', async () => {
    const { StakedREX, rexToken, rewardsVault } = testEnv;

    expect(await StakedREX.name()).to.be.equal(STAKED_REX_NAME);
    expect(await StakedREX.symbol()).to.be.equal(STAKED_REX_SYMBOL);
    expect(await StakedREX.decimals()).to.be.equal(STAKED_REX_DECIMALS);
    expect(await StakedREX.REVISION()).to.be.equal(1);
    expect(await StakedREX.STAKED_TOKEN()).to.be.equal(rexToken.address);
    expect(await StakedREX.REWARD_TOKEN()).to.be.equal(rexToken.address);
    expect((await StakedREX.COOLDOWN_SECONDS()).toString()).to.be.equal(COOLDOWN_SECONDS);
    expect((await StakedREX.UNSTAKE_WINDOW()).toString()).to.be.equal(UNSTAKE_WINDOW);
    expect(await StakedREX.REWARDS_VAULT()).to.be.equal(rewardsVault.address);
  });

  it('Reverts trying to stake 0 amount', async () => {
    const {
      StakedREX,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(StakedREX.connect(staker.signer).stake(staker.address, amount)).to.be.revertedWith(
      'INVALID_ZERO_AMOUNT'
    );
  });

  it('Reverts trying to activate cooldown with 0 staked amount', async () => {
    const {
      StakedREX,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(StakedREX.connect(staker.signer).cooldown()).to.be.revertedWith(
      'INVALID_BALANCE_ON_COOLDOWN'
    );
  });

  it('User 1 stakes 50 REX: receives 50 SREX, StakedREX balance of REX is 50 and his rewards to claim are 0', async () => {
    const {
      StakedREX,
      rexToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('50');

    const saveBalanceBefore = new BigNumber((await StakedREX.balanceOf(staker.address)).toString());

    // Prepare actions for the test case
    const actions = () => [
      rexToken.connect(staker.signer).approve(StakedREX.address, amount),
      StakedREX.connect(staker.signer).stake(staker.address, amount),
    ];

    // Check rewards
    await compareRewardsAtAction(StakedREX, staker.address, actions);

    // Stake token tests
    expect((await StakedREX.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await rexToken.balanceOf(StakedREX.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await StakedREX.balanceOf(staker.address)).toString()).to.be.equal(amount);
    expect((await rexToken.balanceOf(StakedREX.address)).toString()).to.be.equal(amount);
  });

  it('User 1 stakes 20 REX more: his total SREX balance increases, StakedREX balance of REX increases and his reward until now get accumulated', async () => {
    const {
      StakedREX,
      rexToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('20');

    const saveBalanceBefore = new BigNumber((await StakedREX.balanceOf(staker.address)).toString());
    const actions = () => [
      rexToken.connect(staker.signer).approve(StakedREX.address, amount),
      StakedREX.connect(staker.signer).stake(staker.address, amount),
    ];

    // Checks rewards
    await compareRewardsAtAction(StakedREX, staker.address, actions, true);

    // Extra test checks
    expect((await StakedREX.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await rexToken.balanceOf(StakedREX.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
  });

  it('User 1 claim half rewards ', async () => {
    const {
      StakedREX,
      rexToken,
      users: [, staker],
    } = testEnv;
    // Increase time for bigger rewards
    await increaseTimeAndMine(1000);

    const halfRewards = (await StakedREX.stakerRewardsToClaim(staker.address)).div(2);
    const saveUserBalance = await rexToken.balanceOf(staker.address);

    await StakedREX.connect(staker.signer).claimRewards(staker.address, halfRewards);

    const userBalanceAfterActions = await rexToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance.add(halfRewards))).to.be.ok;
  });

  it('User 1 tries to claim higher reward than current rewards balance', async () => {
    const {
      StakedREX,
      rexToken,
      users: [, staker],
    } = testEnv;

    const saveUserBalance = await rexToken.balanceOf(staker.address);

    // Try to claim more amount than accumulated
    await expect(
      StakedREX.connect(staker.signer).claimRewards(
        staker.address,
        ethers.utils.parseEther('10000')
      )
    ).to.be.revertedWith('INVALID_AMOUNT');

    const userBalanceAfterActions = await rexToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance)).to.be.ok;
  });

  it('User 1 claim all rewards', async () => {
    const {
      StakedREX,
      rexToken,
      users: [, staker],
    } = testEnv;

    const userAddress = staker.address;
    const underlyingAsset = StakedREX.address;

    const userBalance = await StakedREX.balanceOf(userAddress);
    const userREXBalance = await rexToken.balanceOf(userAddress);
    const userRewards = await StakedREX.stakerRewardsToClaim(userAddress);
    // Get index before actions
    const userIndexBefore = await getUserIndex(StakedREX, userAddress, underlyingAsset);

    // Claim rewards
    await expect(StakedREX.connect(staker.signer).claimRewards(staker.address, MAX_UINT_AMOUNT));

    // Get index after actions
    const userIndexAfter = await getUserIndex(StakedREX, userAddress, underlyingAsset);

    const expectedAccruedRewards = getRewards(
      userBalance,
      userIndexAfter,
      userIndexBefore
    ).toString();
    const userREXBalanceAfterAction = (await rexToken.balanceOf(userAddress)).toString();

    expect(userREXBalanceAfterAction).to.be.equal(
      userREXBalance.add(userRewards).add(expectedAccruedRewards).toString()
    );
  });

  it('User 6 stakes 50 REX, with the rewards not enabled', async () => {
    const { StakedREX, rexToken, users } = testEnv;
    const amount = ethers.utils.parseEther('50');
    const sixStaker = users[5];

    // Disable rewards via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      rexToken.connect(sixStaker.signer).approve(StakedREX.address, amount),
      StakedREX.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedREX, sixStaker.address, actions, false, assetsConfig);

    // Check expected stake balance for six staker
    expect((await StakedREX.balanceOf(sixStaker.address)).toString()).to.be.equal(
      amount.toString()
    );

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedREX.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('User 6 stakes 30 REX more, with the rewards not enabled', async () => {
    const { StakedREX, rexToken, users } = testEnv;
    const amount = ethers.utils.parseEther('30');
    const staker = users[1];
    const sixStaker = users[5];
    const saveBalanceBefore = new BigNumber(
      (await StakedREX.balanceOf(sixStaker.address)).toString()
    );
    // Keep rewards disabled via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      rexToken.connect(sixStaker.signer).approve(StakedREX.address, amount),
      StakedREX.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedREX, sixStaker.address, actions, false, assetsConfig);

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedREX.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('Validates staker cooldown with stake() while being on valid unstake window', async () => {
    const { StakedREX, rexToken, users } = testEnv;
    const amount1 = ethers.utils.parseEther('50');
    const amount2 = ethers.utils.parseEther('20');
    const staker = users[4];

    // Checks rewards
    const actions = () => [
      rexToken.connect(staker.signer).approve(StakedREX.address, amount1.add(amount2)),
      StakedREX.connect(staker.signer).stake(staker.address, amount1),
    ];

    await compareRewardsAtAction(StakedREX, staker.address, actions, false);

    await StakedREX.connect(staker.signer).cooldown();

    const cooldownActivationTimestamp = await timeLatest();

    await advanceBlock(
      cooldownActivationTimestamp.plus(new BigNumber(COOLDOWN_SECONDS).plus(1000)).toNumber()
    ); // We fast-forward time to just after the unstake window

    const stakerCooldownTimestampBefore = new BigNumber(
      (await StakedREX.stakersCooldowns(staker.address)).toString()
    );
    await waitForTx(await StakedREX.connect(staker.signer).stake(staker.address, amount2));
    const latestTimestamp = await timeLatest();
    const expectedCooldownTimestamp = amount2
      .mul(latestTimestamp.toString())
      .add(amount1.mul(stakerCooldownTimestampBefore.toString()))
      .div(amount2.add(amount1));
    expect(expectedCooldownTimestamp.toString()).to.be.equal(
      (await StakedREX.stakersCooldowns(staker.address)).toString()
    );
  });
});
