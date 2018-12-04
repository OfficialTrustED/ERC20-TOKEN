const { decodeLogs } = require('./helpers/decodeLogs');
const { assertRevert } = require('./helpers/assetRevert');
const expectEvent = require('./helpers/expectEvent');

const TrustEdToken = artifacts.require('TrustEdToken');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('TrustEd Token Management', function ([_, creator, recipient, anotherAccount]) {
  let token;

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    token = await TrustEdToken.new({ from: creator });
  });

  describe('Contract Basic Details', function () {
    it('has a name: \"TrustEd Token\"', async function () {
      (await token.name()).should.equal('TrustEd Token');
    });

    it('has a symbol: \"TED\"', async function () {
      (await token.symbol()).should.equal('TED');
    });

    it('has 18 decimals', async function () {
      (await token.decimals()).should.be.bignumber.equal(18);
    });

    it('has supply of 1.72 billion', async function () {
      (await token.totalSupply()).should.be.bignumber.equal(1720000000e+18);
    });

    it('assigns the initial total supply to the creator', async function () {
      const totalSupply = await token.totalSupply();
      const creatorBalance = await token.balanceOf(creator);

      creatorBalance.should.be.bignumber.equal(totalSupply);

      const receipt = await web3.eth.getTransactionReceipt(token.transactionHash);
      const logs = decodeLogs(receipt.logs, TrustEdToken, token.address);
      logs.length.should.equal(1);
      logs[0].event.should.equal('Transfer');
      logs[0].args.from.valueOf().should.equal(ZERO_ADDRESS);
      logs[0].args.to.valueOf().should.equal(creator);
      logs[0].args.value.should.be.bignumber.equal(totalSupply);
    });
  })


  describe('balanceOf', function () {
    describe('requested account has no tokens initially', function () {
      it('returns zero', async function () {
        (await token.balanceOf(anotherAccount)).should.be.bignumber.equal(0);
      });
    });

    describe('owner account has all tokens initially', function () {
      it('returns 1.72 billion tokens to creator', async function () {
        (await token.balanceOf(creator)).should.be.bignumber.equal(1720000000e+18);
      });
    });
  });

  describe('Transfer Functionalities Before Release', function () {

    describe('when the sender has enough balance and sends 100 tokens', function () {
      const amount = 100;

      it('it reverts', async function () {
        await assertRevert(token.transfer(recipient, amount, { from: creator }));
      });
    });
  });

  describe('Token Release Management', function () {

    it('token transfers are initially locked', async function () {
      (await token.released()).should.equal(false);
    });

    describe('when token release address is set by some address', function () {
      it('it reverts', async function () {
        await assertRevert(token.setReleaseAgent(anotherAccount, { from: anotherAccount }));
      });
    });

    describe('when token release address is set by owner address', function () {
      it('it sets the token release agent', async function () {
        await token.setReleaseAgent(creator, { from: creator });
        (await token.releaseAgent()).should.equal(creator);
      });
    });

    describe('when token is tried to release by some address', function () {
      it('it reverts', async function () {
        await assertRevert(token.releaseTokenTransfer({ from: anotherAccount }));
      });
    });

    describe('when token is tried to be released by owner address', function () {
      it('it release the token transfers', async function () {

        await token.setReleaseAgent(creator, { from: creator });
        await token.releaseTokenTransfer({ from: creator });
        (await token.released()).should.equal(true);
      });
    });

  });

  describe('Transfer Functionalities', async function () {

    beforeEach(async function () {
      await token.setReleaseAgent(creator, { from: creator });
      await token.releaseTokenTransfer({ from: creator });
    });

    describe('when the recipient is not the zero address', function () {
      const to = recipient;

      describe('when the sender does not have enough balance', function () {
        const amount = 2.1e+27;

        it('reverts', async function () {
          await assertRevert(token.transfer(to, amount, { from: creator }));
        });
      });

      describe('when the sender has enough balance', function () {

        const amount = 1e+26;

        it('transfers 100m tokens', async function () {

          await token.transfer(to, amount, { from: creator });
          (await token.balanceOf(creator)).should.be.bignumber.equal(1.62e+27);
          (await token.balanceOf(to)).should.be.bignumber.equal(amount);
        });

        it('emits a transfer event', async function () {

          const { logs } = await token.transfer(to, amount, { from: creator });
          const event = expectEvent.inLogs(logs, 'Transfer', {
            from: creator,
            to: to,
          });

          event.args.value.should.be.bignumber.equal(amount);
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;
      it('reverts', async function () {
        await assertRevert(token.transfer(to, 100, { from: creator }));
      });
    });
  });


  describe('Approve Functionalities', function () {

    beforeEach(async function () {
      await token.setReleaseAgent(creator, { from: creator });
      await token.releaseTokenTransfer({ from: creator });
    });

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        const amount = 100;

        it('emits an approval event', async function () {
          const { logs } = await token.approve(spender, amount, { from: creator });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(creator);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await token.approve(spender, amount, { from: creator });

            (await token.allowance(creator, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await token.approve(spender, 1, { from: creator });
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await token.approve(spender, amount, { from: creator });

            (await token.allowance(creator, spender)).should.be.bignumber.equal(amount);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = 2.1e+27;

        it('emits an approval event', async function () {
          const { logs } = await token.approve(spender, amount, { from: creator });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(creator);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await token.approve(spender, amount, { from: creator });

            (await token.allowance(creator, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await token.approve(spender, 1, { from: creator });
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await token.approve(spender, amount, { from: creator });

            (await token.allowance(creator, spender)).should.be.bignumber.equal(amount);
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = 100;
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(token.approve(spender, amount, { from: creator }));
      });
    });
  });


  describe('Transfer From  Functionalities', function () {

    beforeEach(async function () {
      await token.setReleaseAgent(creator, { from: owner });
      await token.releaseTokenTransfer({ from: owner });
    });

    const spender = recipient;
    const owner = creator;

    describe('when the recipient is not the zero address', function () {
      const to = anotherAccount;

      describe('when the spender has enough approved balance', function () {
        beforeEach(async function () {
          await token.approve(spender, 1.72e+27, { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = 1.72e+27;

          it('transfers the requested amount', async function () {
            await token.transferFrom(owner, to, amount, { from: spender });

            (await token.balanceOf(owner)).should.be.bignumber.equal(0);

            (await token.balanceOf(to)).should.be.bignumber.equal(amount);
          });

          it('decreases the spender allowance', async function () {
            await token.transferFrom(owner, to, amount, { from: spender });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(0);
          });

          it('emits a transfer event', async function () {
            const { logs } = await token.transferFrom(owner, to, amount, { from: spender });

            logs.length.should.equal(1);
            logs[0].event.should.equal('Transfer');
            logs[0].args.from.should.equal(owner);
            logs[0].args.to.should.equal(to);
            logs[0].args.value.should.be.bignumber.equal(amount);
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = 2.1e+27;;

          it('reverts', async function () {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', function () {
        beforeEach(async function () {
          await token.approve(spender, 1.8e+27, { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = 1.9e+27;

          it('reverts', async function () {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = 2.3e+27;

          it('reverts', async function () {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const amount = 100;
      const to = ZERO_ADDRESS;

      beforeEach(async function () {
        await token.approve(spender, amount, { from: owner });
      });

      it('reverts', async function () {
        await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
      });
    });
  });


  describe('Decrease Allowance Functionalities', function () {

    const owner = creator;

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      function shouldDecreaseApproval(amount) {
        describe('when there was no approved amount before', function () {
          it('reverts', async function () {
            await assertRevert(token.decreaseAllowance(spender, amount, { from: owner }));
          });
        });

        describe('when the spender had an approved amount', function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.logs } = await token.approve(spender, approvedAmount, { from: owner }));
          });

          it('emits an approval event', async function () {
            const { logs } = await token.decreaseAllowance(spender, approvedAmount, { from: owner });

            logs.length.should.equal(1);
            logs[0].event.should.equal('Approval');
            logs[0].args.owner.should.equal(owner);
            logs[0].args.spender.should.equal(spender);
            logs[0].args.value.should.be.bignumber.equal(0);
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            
            await token.decreaseAllowance(spender, approvedAmount - 1, { from: owner });
            (await token.allowance(owner, spender)).should.be.bignumber.equal(1);
          });

          it('sets the allowance to zero when all allowance is removed', async function () {
            await token.decreaseAllowance(spender, approvedAmount, { from: owner });
            (await token.allowance(owner, spender)).should.be.bignumber.equal(0);
          });

          it('reverts when more than the full allowance is removed', async function () {
            await assertRevert(token.decreaseAllowance(spender, approvedAmount + 1, { from: owner }));
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = 100;

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = 101;

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = 100;
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(token.decreaseAllowance(spender, amount, { from: owner }));
      });
    });
  });

  describe('Increase Allowance Functionality', function () {
    const amount = 100;
    const owner = creator;

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        it('emits an approval event', async function () {
          const { logs } = await token.increaseAllowance(spender, amount, { from: owner });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount + 1);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = 101;

        it('emits an approval event', async function () {
          const { logs } = await token.increaseAllowance(spender, amount, { from: owner });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount + 1);
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(token.increaseAllowance(spender, amount, { from: owner }));
      });
    });
  });


  describe('Burn Functionality', function () {
    const initialSupply = new BigNumber(1.72e+27);
    const owner = creator;
    const amount = 1e+26; //100m

    it('rejects any random account to burn', async function () {
      await assertRevert(token.burn(1, {from: recipient}));
    });

    it('owner also cannot burn at this point', async function () {
      await assertRevert(token.burn(1, {from: owner}));
    });

    it('nobody else except owner can set burningAgent', async function () {
      await assertRevert(token.setBurningAgent(recipient, true, {from: anotherAccount}));
    });

    it('only owner can set burning agent', async function () {
      ({ logs: this.logs } = await token.setBurningAgent(recipient, true, {from: owner}));
      const event = expectEvent.inLogs(this.logs, 'BurningAgentAdded');
      event.args.account.should.equal(recipient);
    });

    describe('burning agent can burn own amount', function () {
      
      beforeEach(async function () {
        await token.setBurningAgent(owner, true, {from: owner});
        ({ logs: this.logs } = await token.burn(amount, { from: owner }));
      });
  
      it('burns the requested amount', async function () {
        (await token.balanceOf(owner)).should.be.bignumber.equal(initialSupply - amount);
      });
  
      it('emits a transfer event', async function () {
        const event = expectEvent.inLogs(this.logs, 'Transfer');
        event.args.from.should.equal(owner);
        event.args.to.should.equal(ZERO_ADDRESS);
        event.args.value.should.be.bignumber.equal(amount);
      });
    });
  });

  describe('Mint Functionality', function () {
    const initialSupply = new BigNumber(1.72e+27);
    const owner = creator;
    const amount = 1e+26; //100m

    it('rejects any random account to mint', async function () {
      await assertRevert(token.mint(recipient, 1, {from: recipient}));
    });

    it('owner also cannot mint at this point', async function () {
      await assertRevert(token.mint(owner, 1, {from: owner}));
    });

    it('nobody else except owner can set mintingAgent', async function () {
      await assertRevert(token.setMintingAgent(recipient, true, {from: anotherAccount}));
    });

    it('only owner can set minting agent', async function () {
      ({ logs: this.logs } = await token.setMintingAgent(recipient, true, {from: owner}));
      const event = expectEvent.inLogs(this.logs, 'MinterAdded');
      event.args.account.should.equal(recipient);
    });

    describe('minting agent cannot mint amount till time has expired', function () {
      
      beforeEach(async function () {
        await token.setMintingAgent(owner, true, {from: owner});
      });
  
      it('cannot mint the requested amount', async function () {
        await assertRevert(token.mint(recipient, amount, { from: owner }));
      });
  
    });
  });

  
});