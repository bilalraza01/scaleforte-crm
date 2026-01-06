module Api
  module V1
    class CategoryAssignmentsController < ApplicationController
      before_action :set_user

      # GET /api/v1/users/:user_id/category_assignments
      def index
        list = policy_scope(@user.category_assignments).includes(:category)
        render json: CategoryAssignmentResource.new(list).serialize
      end

      # POST /api/v1/users/:user_id/category_assignments
      def create
        # Authorise on the target user — manager can only assign to their own SDRs.
        authorize @user, policy_class: CategoryAssignmentPolicy
        category_id = params.require(:category_assignment).require(:category_id)
        assignment  = @user.category_assignments.find_or_initialize_by(category_id: category_id)
        assignment.assigned_by_user = current_user if assignment.new_record?

        if assignment.save
          AuditLog.record!(user: current_user, action: :category_assigned, resource: assignment, request: request,
                           metadata: { user_id: @user.id, category_id: category_id.to_i })
          render json: CategoryAssignmentResource.new(assignment).serialize, status: :created
        else
          render json: { errors: assignment.errors }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/users/:user_id/category_assignments/:id
      def destroy
        assignment = @user.category_assignments.find(params[:id])
        authorize assignment, :destroy?
        assignment.destroy!
        AuditLog.record!(user: current_user, action: :category_unassigned, resource: assignment, request: request,
                         metadata: { user_id: @user.id, category_id: assignment.category_id })
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:user_id])
      end
    end
  end
end
