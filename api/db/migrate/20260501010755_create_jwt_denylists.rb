# Tracks revoked JWTs (devise-jwt JTI matcher strategy).
# When a user signs out we record the token's JTI so subsequent requests
# carrying it are rejected.

class CreateJwtDenylists < ActiveRecord::Migration[7.1]
  def change
    create_table :jwt_denylists do |t|
      t.string   :jti, null: false
      t.datetime :exp, null: false

      t.timestamps
    end

    add_index :jwt_denylists, :jti, unique: true
  end
end
