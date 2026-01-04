# frozen_string_literal: true

class DeviseCreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      ## Database authenticatable
      t.string :email,              null: false, default: ""
      t.string :encrypted_password, null: false, default: ""

      ## Recoverable
      t.string   :reset_password_token
      t.datetime :reset_password_sent_at

      ## Rememberable
      t.datetime :remember_created_at

      ## Scaleforte fields (PRD §6.1, §8.2)
      t.string  :name,    null: false, default: ""
      t.integer :role,    null: false, default: 2  # enum: admin=0, manager=1, sdr=2
      t.references :manager, foreign_key: { to_table: :users }, null: true
      t.boolean :active,  null: false, default: true

      t.timestamps null: false
    end

    add_index :users, :email,                unique: true
    add_index :users, :reset_password_token, unique: true
    add_index :users, :role
    add_index :users, :active
  end
end
