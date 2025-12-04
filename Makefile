install-bun:
	curl -fsSL https://bun.sh/install | bash

install-noir:
	curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
	noirup --version 1.0.0-beta.16

install-barretenberg:
	curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/master/barretenberg/bbup/install | bash
	bbup --version 3.0.0-nightly.20251104

install-starknet:
	curl --proto '=https' --tlsv1.2 -sSf https://sh.starkup.dev | sh

install-devnet:
	asdf plugin add starknet-devnet
	asdf install starknet-devnet 0.6.1

install-garaga:
	uv pip install garaga==1.0.1 --prerelease=allow

install-app-deps:
	cd app && bun install

update-tools:
	asdf install starknet-devnet
	asdf install starknet-foundry
	asdf install scarb

devnet:
	starknet-devnet --accounts=2 --seed=0 --initial-balance=100000000000000000000000

accounts-file:
	curl -s -X POST -H "Content-Type: application/json" \
		--data '{"jsonrpc":"2.0","id":"1","method":"devnet_getPredeployedAccounts"}' http://127.0.0.1:5050/ \
		| jq '{"alpha-sepolia": {"devnet0": {
			address: .result[0].address,
			private_key: .result[0].private_key,
			public_key: .result[0].public_key,
			class_hash: "0xe2eb8f5672af4e6a4e8a8f1b44989685e668489b0a25437733756c5a34a1d6",
			deployed: true,
			legacy: false,
			salt: "0x14",
			type: "open_zeppelin"
		}}}' > ./contracts/accounts.json

build-circuit:
	cd circuit && nargo build

test-circuit:
	cd circuit && nargo test

exec-circuit:
	cd circuit && nargo execute witness

prove-circuit:
	bb prove --scheme ultra_honk \
		--oracle_hash keccak \
		-b ./circuit/target/circuit.json \
		-w ./circuit/target/witness.gz \
		-k ./circuit/target/vk \
		-o ./circuit/target

gen-vk:
	bb write_vk --scheme ultra_honk --oracle_hash keccak -b ./circuit/target/circuit.json -o ./circuit/target

gen-verifier:
	cd contracts && uv run garaga gen --system ultra_keccak_zk_honk --vk ../circuit/target/vk --project-name verifier

build-verifier:
	cd contracts/verifier && scarb build

build-payment:
	cd contracts/payment && scarb build

build-contracts:
	cd contracts && scarb build

declare-verifier:
	cd contracts && sncast declare --package verifier --contract-name UltraKeccakZKHonkVerifier

	# 0x0204901771d84536864668841a8aa7e4ab0de85af88794fdabdaf4dcb17e2f46
deploy-verifier:
	# TODO: use class hash from the result of the `make declare-verifier` step
	cd contracts && sncast deploy --salt 0x00 --class-hash 0x131e765f4b78d5fe82bb981523ed996e4d730a193a374abbe9da5a0efd19dd7

declare-payment:
	cd contracts && sncast declare --package payment --contract-name TherapyPayment

	# 0x0773b362b26570426d18d39f9a21ccb3e045971d9d4d0ca98df23080b34169d5
deploy-payment:
	# TODO: use class hash from declare-payment and verifier address from deploy-verifier
	cd contracts && sncast deploy --salt 0x01 --class-hash 0x13527708f3080795206ea55cd5ed6559d97af76c02f1c8f080f54b28eb7422a --constructor-calldata 0x0204901771d84536864668841a8aa7e4ab0de85af88794fdabdaf4dcb17e2f46

# ==================== App Commands ====================

artifacts:
	cp ./circuit/target/circuit.json ./app/src/assets/circuit.json
	cp ./circuit/target/vk ./app/src/assets/vk.bin
	cp ./contracts/target/release/verifier_UltraKeccakZKHonkVerifier.contract_class.json ./app/src/assets/verifier.json
	cp ./contracts/target/release/payment_TherapyPayment.contract_class.json ./app/src/assets/payment.json

run-app:
	cd app && bun run dev

build-app:
	cd app && bun run build

# ==================== Full Setup ====================

setup: build-circuit gen-vk gen-verifier build-contracts artifacts
	@echo "Setup complete! Start devnet with 'make devnet' in another terminal"
	@echo "Then run 'make accounts-file' followed by 'make declare-verifier' and 'make deploy-verifier'"
	@echo "Finally run 'make run-app' to start the application"

# ==================== Help ====================

help:
	@echo "Private Therapy Payments - Available Commands:"
	@echo ""
	@echo "Installation:"
	@echo "  make install-bun        - Install Bun package manager"
	@echo "  make install-noir       - Install Noir compiler"
	@echo "  make install-barretenberg - Install Barretenberg"
	@echo "  make install-starknet   - Install Starknet toolkit"
	@echo "  make install-devnet     - Install Starknet devnet"
	@echo "  make install-garaga     - Install Garaga"
	@echo "  make install-app-deps   - Install app dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make devnet             - Start local Starknet devnet"
	@echo "  make accounts-file      - Generate accounts file from devnet"
	@echo ""
	@echo "Circuit:"
	@echo "  make build-circuit      - Build the Noir circuit"
	@echo "  make test-circuit       - Run circuit tests"
	@echo "  make exec-circuit       - Execute circuit with sample inputs"
	@echo "  make gen-vk             - Generate verification key"
	@echo ""
	@echo "Contracts:"
	@echo "  make gen-verifier       - Generate verifier contract from VK"
	@echo "  make build-contracts    - Build all contracts"
	@echo "  make declare-verifier   - Declare verifier contract"
	@echo "  make deploy-verifier    - Deploy verifier contract"
	@echo "  make declare-payment    - Declare payment contract"
	@echo "  make deploy-payment     - Deploy payment contract"
	@echo ""
	@echo "App:"
	@echo "  make artifacts          - Copy circuit artifacts to app"
	@echo "  make run-app            - Run the web app"
	@echo "  make build-app          - Build the web app"
	@echo ""
	@echo "Full Setup:"
	@echo "  make setup              - Complete setup (circuit + contracts + artifacts)"
