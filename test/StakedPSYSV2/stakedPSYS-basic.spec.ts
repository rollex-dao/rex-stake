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

makeSuite('StakedREX V2. Basics', (testEnv: TestEnv) => {
  it('Initial configuration after initialize() is correct', async () => {
    const { StakedREXV3, rexToken, rewardsVault } = testEnv;

    expect(await StakedREXV3.name()).to.be.equal(STAKED_REX_NAME);
    expect(await StakedREXV3.symbol()).to.be.equal(STAKED_REX_SYMBOL);
    expect(await StakedREXV3.decimals()).to.be.equal(STAKED_REX_DECIMALS);
    expect(await StakedREXV3.REVISION()).to.be.equal(2);
    expect(await StakedREXV3.STAKED_TOKEN()).to.be.equal(rexToken.address);
    expect(await StakedREXV3.REWARD_TOKEN()).to.be.equal(rexToken.address);
    expect((await StakedREXV3.COOLDOWN_SECONDS()).toString()).to.be.equal(COOLDOWN_SECONDS);
    expect((await StakedREXV3.UNSTAKE_WINDOW()).toString()).to.be.equal(UNSTAKE_WINDOW);
    expect(await StakedREXV3.REWARDS_VAULT()).to.be.equal(rewardsVault.address);
  });

  it('Reverts trying to stake 0 amount', async () => {
    const {
      StakedREXV3,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(
      StakedREXV3.connect(staker.signer).stake(staker.address, amount)
    ).to.be.revertedWith('INVALID_ZERO_AMOUNT');
  });

  it('Reverts trying to activate cooldown with 0 staked amount', async () => {
    const {
      StakedREXV3,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(StakedREXV3.connect(staker.signer).cooldown()).to.be.revertedWith(
      'INVALID_BALANCE_ON_COOLDOWN'
    );
  });

  it('User 1 stakes 50 REX: receives 50 SREX, StakedREX balance of REX is 50 and his rewards to claim are 0', async () => {
    const {
      StakedREXV3,
      rexToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('50');

    const saveBalanceBefore = new BigNumber(
      (await StakedREXV3.balanceOf(staker.address)).toString()
    );

    // Prepare actions for the test case
    const actions = () => [
      rexToken.connect(staker.signer).approve(StakedREXV3.address, amount),
      StakedREXV3.connect(staker.signer).stake(staker.address, amount),
    ];

    // Check rewards
    await compareRewardsAtAction(StakedREXV3, staker.address, actions);

    // Stake token tests
    expect((await StakedREXV3.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await rexToken.balanceOf(StakedREXV3.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await StakedREXV3.balanceOf(staker.address)).toString()).to.be.equal(amount);
    expect((await rexToken.balanceOf(StakedREXV3.address)).toString()).to.be.equal(amount);
  });

  it('User 1 stakes 20 REX more: his total SREX balance increases, StakedREX balance of REX increases and his reward until now get accumulated', async () => {
    const {
      StakedREXV3,
      rexToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('20');

    const saveBalanceBefore = new BigNumber(
      (await StakedREXV3.balanceOf(staker.address)).toString()
    );
    const actions = () => [
      rexToken.connect(staker.signer).approve(StakedREXV3.address, amount),
      StakedREXV3.connect(staker.signer).stake(staker.address, amount),
    ];

    // Checks rewards
    await compareRewardsAtAction(StakedREXV3, staker.address, actions, true);

    // Extra test checks
    expect((await StakedREXV3.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await rexToken.balanceOf(StakedREXV3.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
  });

  it('User 1 claim half rewards ', async () => {
    const {
      StakedREXV3,
      rexToken,
      users: [, staker],
    } = testEnv;
    // Increase time for bigger rewards
    await increaseTimeAndMine(1000);

    const halfRewards = (await StakedREXV3.stakerRewardsToClaim(staker.address)).div(2);
    const saveUserBalance = await rexToken.balanceOf(staker.address);

    await StakedREXV3.connect(staker.signer).claimRewards(staker.address, halfRewards);

    const userBalanceAfterActions = await rexToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance.add(halfRewards))).to.be.ok;
  });

  it('User 1 tries to claim higher reward than current rewards balance', async () => {
    const {
      StakedREXV3,
      rexToken,
      users: [, staker],
    } = testEnv;

    const saveUserBalance = await rexToken.balanceOf(staker.address);

    // Try to claim more amount than accumulated
    await expect(
      StakedREXV3.connect(staker.signer).claimRewards(
        staker.address,
        ethers.utils.parseEther('10000')
      )
    ).to.be.revertedWith('INVALID_AMOUNT');

    const userBalanceAfterActions = await rexToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance)).to.be.ok;
  });

  it('User 1 claim all rewards', async () => {
    const {
      StakedREXV3,
      rexToken,
      users: [, staker],
    } = testEnv;

    const userAddress = staker.address;
    const underlyingAsset = StakedREXV3.address;

    const userBalance = await StakedREXV3.balanceOf(userAddress);
    const userREXBalance = await rexToken.balanceOf(userAddress);
    const userRewards = await StakedREXV3.stakerRewardsToClaim(userAddress);
    // Get index before actions
    const userIndexBefore = await getUserIndex(StakedREXV3, userAddress, underlyingAsset);

    // Claim rewards
    await expect(StakedREXV3.connect(staker.signer).claimRewards(staker.address, MAX_UINT_AMOUNT));

    // Get index after actions
    const userIndexAfter = await getUserIndex(StakedREXV3, userAddress, underlyingAsset);

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
    const { StakedREXV3, rexToken, users } = testEnv;
    const amount = ethers.utils.parseEther('50');
    const sixStaker = users[5];

    // Disable rewards via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      rexToken.connect(sixStaker.signer).approve(StakedREXV3.address, amount),
      StakedREXV3.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedREXV3, sixStaker.address, actions, false, assetsConfig);

    // Check expected stake balance for six staker
    expect((await StakedREXV3.balanceOf(sixStaker.address)).toString()).to.be.equal(
      amount.toString()
    );

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedREXV3.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('User 6 stakes 30 REX more, with the rewards not enabled', async () => {
    const { StakedREXV3, rexToken, users } = testEnv;
    const amount = ethers.utils.parseEther('30');
    const staker = users[1];
    const sixStaker = users[5];
    const saveBalanceBefore = new BigNumber(
      (await StakedREXV3.balanceOf(sixStaker.address)).toString()
    );
    // Keep rewards disabled via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      rexToken.connect(sixStaker.signer).approve(StakedREXV3.address, amount),
      StakedREXV3.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedREXV3, sixStaker.address, actions, false, assetsConfig);

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedREXV3.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('Validates staker cooldown with stake() while being on valid unstake window', async () => {
    const { StakedREXV3, rexToken, users } = testEnv;
    const amount1 = ethers.utils.parseEther('50');
    const amount2 = ethers.utils.parseEther('20');
    const staker = users[4];

    // Checks rewards
    const actions = () => [
      rexToken.connect(staker.signer).approve(StakedREXV3.address, amount1.add(amount2)),
      StakedREXV3.connect(staker.signer).stake(staker.address, amount1),
    ];

    await compareRewardsAtAction(StakedREXV3, staker.address, actions, false);

    await StakedREXV3.connect(staker.signer).cooldown();

    const cooldownActivationTimestamp = await timeLatest();

    await advanceBlock(
      cooldownActivationTimestamp.plus(new BigNumber(COOLDOWN_SECONDS).plus(1000)).toNumber()
    ); // We fast-forward time to just after the unstake window

    const stakerCooldownTimestampBefore = new BigNumber(
      (await StakedREXV3.stakersCooldowns(staker.address)).toString()
    );
    await waitForTx(await StakedREXV3.connect(staker.signer).stake(staker.address, amount2));
    const latestTimestamp = await timeLatest();
    const expectedCooldownTimestamp = amount2
      .mul(latestTimestamp.toString())
      .add(amount1.mul(stakerCooldownTimestampBefore.toString()))
      .div(amount2.add(amount1));
    expect(expectedCooldownTimestamp.toString()).to.be.equal(
      (await StakedREXV3.stakersCooldowns(staker.address)).toString()
    );
  });
});
