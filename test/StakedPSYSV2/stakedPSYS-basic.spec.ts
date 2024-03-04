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

makeSuite('StakedPSYS V2. Basics', (testEnv: TestEnv) => {
  it('Initial configuration after initialize() is correct', async () => {
    const { StakedPSYSV2, psysToken, rewardsVault } = testEnv;

    expect(await StakedPSYSV2.name()).to.be.equal(STAKED_PSYS_NAME);
    expect(await StakedPSYSV2.symbol()).to.be.equal(STAKED_PSYS_SYMBOL);
    expect(await StakedPSYSV2.decimals()).to.be.equal(STAKED_PSYS_DECIMALS);
    expect(await StakedPSYSV2.REVISION()).to.be.equal(2);
    expect(await StakedPSYSV2.STAKED_TOKEN()).to.be.equal(psysToken.address);
    expect(await StakedPSYSV2.REWARD_TOKEN()).to.be.equal(psysToken.address);
    expect((await StakedPSYSV2.COOLDOWN_SECONDS()).toString()).to.be.equal(COOLDOWN_SECONDS);
    expect((await StakedPSYSV2.UNSTAKE_WINDOW()).toString()).to.be.equal(UNSTAKE_WINDOW);
    expect(await StakedPSYSV2.REWARDS_VAULT()).to.be.equal(rewardsVault.address);
  });

  it('Reverts trying to stake 0 amount', async () => {
    const {
      StakedPSYSV2,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(
      StakedPSYSV2.connect(staker.signer).stake(staker.address, amount)
    ).to.be.revertedWith('INVALID_ZERO_AMOUNT');
  });

  it('Reverts trying to activate cooldown with 0 staked amount', async () => {
    const {
      StakedPSYSV2,
      users: [, staker],
    } = testEnv;
    const amount = '0';

    await expect(StakedPSYSV2.connect(staker.signer).cooldown()).to.be.revertedWith(
      'INVALID_BALANCE_ON_COOLDOWN'
    );
  });

  it('User 1 stakes 50 PSYS: receives 50 SPSYS, StakedPSYS balance of PSYS is 50 and his rewards to claim are 0', async () => {
    const {
      StakedPSYSV2,
      psysToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('50');

    const saveBalanceBefore = new BigNumber(
      (await StakedPSYSV2.balanceOf(staker.address)).toString()
    );

    // Prepare actions for the test case
    const actions = () => [
      psysToken.connect(staker.signer).approve(StakedPSYSV2.address, amount),
      StakedPSYSV2.connect(staker.signer).stake(staker.address, amount),
    ];

    // Check rewards
    await compareRewardsAtAction(StakedPSYSV2, staker.address, actions);

    // Stake token tests
    expect((await StakedPSYSV2.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await psysToken.balanceOf(StakedPSYSV2.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await StakedPSYSV2.balanceOf(staker.address)).toString()).to.be.equal(amount);
    expect((await psysToken.balanceOf(StakedPSYSV2.address)).toString()).to.be.equal(amount);
  });

  it('User 1 stakes 20 PSYS more: his total SPSYS balance increases, StakedPSYS balance of PSYS increases and his reward until now get accumulated', async () => {
    const {
      StakedPSYSV2,
      psysToken,
      users: [, staker],
    } = testEnv;
    const amount = ethers.utils.parseEther('20');

    const saveBalanceBefore = new BigNumber(
      (await StakedPSYSV2.balanceOf(staker.address)).toString()
    );
    const actions = () => [
      psysToken.connect(staker.signer).approve(StakedPSYSV2.address, amount),
      StakedPSYSV2.connect(staker.signer).stake(staker.address, amount),
    ];

    // Checks rewards
    await compareRewardsAtAction(StakedPSYSV2, staker.address, actions, true);

    // Extra test checks
    expect((await StakedPSYSV2.balanceOf(staker.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
    expect((await psysToken.balanceOf(StakedPSYSV2.address)).toString()).to.be.equal(
      saveBalanceBefore.plus(amount.toString()).toString()
    );
  });

  it('User 1 claim half rewards ', async () => {
    const {
      StakedPSYSV2,
      psysToken,
      users: [, staker],
    } = testEnv;
    // Increase time for bigger rewards
    await increaseTimeAndMine(1000);

    const halfRewards = (await StakedPSYSV2.stakerRewardsToClaim(staker.address)).div(2);
    const saveUserBalance = await psysToken.balanceOf(staker.address);

    await StakedPSYSV2.connect(staker.signer).claimRewards(staker.address, halfRewards);

    const userBalanceAfterActions = await psysToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance.add(halfRewards))).to.be.ok;
  });

  it('User 1 tries to claim higher reward than current rewards balance', async () => {
    const {
      StakedPSYSV2,
      psysToken,
      users: [, staker],
    } = testEnv;

    const saveUserBalance = await psysToken.balanceOf(staker.address);

    // Try to claim more amount than accumulated
    await expect(
      StakedPSYSV2.connect(staker.signer).claimRewards(
        staker.address,
        ethers.utils.parseEther('10000')
      )
    ).to.be.revertedWith('INVALID_AMOUNT');

    const userBalanceAfterActions = await psysToken.balanceOf(staker.address);
    expect(userBalanceAfterActions.eq(saveUserBalance)).to.be.ok;
  });

  it('User 1 claim all rewards', async () => {
    const {
      StakedPSYSV2,
      psysToken,
      users: [, staker],
    } = testEnv;

    const userAddress = staker.address;
    const underlyingAsset = StakedPSYSV2.address;

    const userBalance = await StakedPSYSV2.balanceOf(userAddress);
    const userPSYSBalance = await psysToken.balanceOf(userAddress);
    const userRewards = await StakedPSYSV2.stakerRewardsToClaim(userAddress);
    // Get index before actions
    const userIndexBefore = await getUserIndex(StakedPSYSV2, userAddress, underlyingAsset);

    // Claim rewards
    await expect(StakedPSYSV2.connect(staker.signer).claimRewards(staker.address, MAX_UINT_AMOUNT));

    // Get index after actions
    const userIndexAfter = await getUserIndex(StakedPSYSV2, userAddress, underlyingAsset);

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
    const { StakedPSYSV2, psysToken, users } = testEnv;
    const amount = ethers.utils.parseEther('50');
    const sixStaker = users[5];

    // Disable rewards via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      psysToken.connect(sixStaker.signer).approve(StakedPSYSV2.address, amount),
      StakedPSYSV2.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedPSYSV2, sixStaker.address, actions, false, assetsConfig);

    // Check expected stake balance for six staker
    expect((await StakedPSYSV2.balanceOf(sixStaker.address)).toString()).to.be.equal(
      amount.toString()
    );

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedPSYSV2.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('User 6 stakes 30 PSYS more, with the rewards not enabled', async () => {
    const { StakedPSYSV2, psysToken, users } = testEnv;
    const amount = ethers.utils.parseEther('30');
    const staker = users[1];
    const sixStaker = users[5];
    const saveBalanceBefore = new BigNumber(
      (await StakedPSYSV2.balanceOf(sixStaker.address)).toString()
    );
    // Keep rewards disabled via config
    const assetsConfig = {
      emissionPerSecond: '0',
      totalStaked: '0',
    };

    // Checks rewards
    const actions = () => [
      psysToken.connect(sixStaker.signer).approve(StakedPSYSV2.address, amount),
      StakedPSYSV2.connect(sixStaker.signer).stake(sixStaker.address, amount),
    ];

    await compareRewardsAtAction(StakedPSYSV2, sixStaker.address, actions, false, assetsConfig);

    // Expect rewards balance to still be zero
    const rewardsBalance = await (
      await StakedPSYSV2.getTotalRewardsBalance(sixStaker.address)
    ).toString();
    expect(rewardsBalance).to.be.equal('0');
  });

  it('Validates staker cooldown with stake() while being on valid unstake window', async () => {
    const { StakedPSYSV2, psysToken, users } = testEnv;
    const amount1 = ethers.utils.parseEther('50');
    const amount2 = ethers.utils.parseEther('20');
    const staker = users[4];

    // Checks rewards
    const actions = () => [
      psysToken.connect(staker.signer).approve(StakedPSYSV2.address, amount1.add(amount2)),
      StakedPSYSV2.connect(staker.signer).stake(staker.address, amount1),
    ];

    await compareRewardsAtAction(StakedPSYSV2, staker.address, actions, false);

    await StakedPSYSV2.connect(staker.signer).cooldown();

    const cooldownActivationTimestamp = await timeLatest();

    await advanceBlock(
      cooldownActivationTimestamp.plus(new BigNumber(COOLDOWN_SECONDS).plus(1000)).toNumber()
    ); // We fast-forward time to just after the unstake window

    const stakerCooldownTimestampBefore = new BigNumber(
      (await StakedPSYSV2.stakersCooldowns(staker.address)).toString()
    );
    await waitForTx(await StakedPSYSV2.connect(staker.signer).stake(staker.address, amount2));
    const latestTimestamp = await timeLatest();
    const expectedCooldownTimestamp = amount2
      .mul(latestTimestamp.toString())
      .add(amount1.mul(stakerCooldownTimestampBefore.toString()))
      .div(amount2.add(amount1));
    expect(expectedCooldownTimestamp.toString()).to.be.equal(
      (await StakedPSYSV2.stakersCooldowns(staker.address)).toString()
    );
  });
});
