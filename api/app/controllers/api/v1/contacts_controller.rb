module Api
  module V1
    class ContactsController < ApplicationController
      before_action :set_brand
      before_action :set_contact, only: [:update, :destroy]

      def create
        @contact = @brand.contacts.build(contact_params)
        authorize @contact, :create?
        if @contact.save
          render json: ContactResource.new(@contact).serialize, status: :created
        else
          render json: { errors: @contact.errors }, status: :unprocessable_entity
        end
      end

      def update
        authorize @contact, :update?
        if @contact.update(contact_params)
          render json: ContactResource.new(@contact).serialize
        else
          render json: { errors: @contact.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize @contact, :destroy?
        @contact.destroy
        head :no_content
      end

      # GET /api/v1/contacts/dedupe?email=... — soft warning (FR-3.7).
      def dedupe
        skip_authorization
        email = params.require(:email)
        match = Contact.where("lower(email) = ?", email.downcase).first
        if match
          render json: { exists: true, brand_id: match.brand_id, sdr_name: match.brand.sdr&.display_name }
        else
          render json: { exists: false }
        end
      end

      private

      def set_brand
        @brand = Brand.find(params[:brand_id])
      end

      def set_contact
        @contact = @brand.contacts.find(params[:id])
      end

      def contact_params
        params.require(:contact).permit(:name, :designation, :email, :phone, :personal_linkedin, :is_primary)
      end
    end
  end
end
