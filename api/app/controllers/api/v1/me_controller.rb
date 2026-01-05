module Api
  module V1
    class MeController < ApplicationController
      def show
        authorize current_user, :show?
        render json: UserResource.new(current_user).serialize
      end
    end
  end
end
